import os
import json

YEARS = list(range(2020, 2026))
QUARTERS = ["Q1", "Q2", "Q3", "Q4"]

INPUTS = {
    "PRETB": {
        "folder": "TB_Annexure",
        "label": "presumptive ds tb examined for diagnosis",
        "output_dir": "OUTPUT_QTR/PRETB"
    },
    "TB": {
        "folder": "TB_Case_Finding",
        "label": "grand total",
        "output_dir": "OUTPUT_QTR/TB"
    },
    "NSP": {
        "folder": "TB_Outcomes",
        "numerator": "nsp cured",
        "denominator": "nsp total",
        "output_dir": "OUTPUT_QTR/NSP"
    },
    "RT": {
        "folder": "TB_Outcomes",
        "numerator": "rt +ve cured",
        "denominator": "rt +ve total",
        "output_dir": "OUTPUT_QTR/RT"
    }
}

OUTPUT_FILE_NAMES = {
    "total_projects": "tp",
    "dfit_projects": "dfit",
    "supported_projects": "sup",
    "nellore": "nel",
    "delhi": "del",
    "dos": "dos",
    "polambakam": "pol",
    "dhanbad": "dan",
    "amda": "amd",
    "arasipalyam": "ars",
    "fathimnagar": "fat",
    "nagepalli": "nag",
    "pavagada": "pav",
    "belatanr": "bel",
    "popejohngarden": "pop",
    "chilakalapalli": "chi",
    "trivendrum": "tri",
    "andipatti": "and",
    "ambalamoola": "amb"
}

def clear_folder(folder_path):
    os.makedirs(folder_path, exist_ok=True)
    for file in os.listdir(folder_path):
        if file.endswith(".json"):
            os.remove(os.path.join(folder_path, file))

def extract_quarter_data(data, label, year):
    label = label.strip().lower()
    result = {}
    for q, qtext in zip(QUARTERS, ["I", "II", "III", "IV"]):
        key = f"{qtext} Qtr-{year}"
        result[q] = None if (year == 2025 and q in ["Q3", "Q4"]) else 0

    for row in data:
        contents = ""
        for key in row:
            if key.strip().lower() in ["contents", "annexure m contents", "type of cases", "type of ccses"]:
                contents = str(row[key]).strip().lower()
                break
        if contents == label:
            for q, qtext in zip(QUARTERS, ["I", "II", "III", "IV"]):
                col = f"{qtext} Qtr-{year}"
                val = row.get(col)
                if val is None or str(val).strip() == "":
                    if year == 2025 and q in ["Q3", "Q4"]:
                        result[q] = None
                else:
                    try:
                        num = round(float(str(val).replace(",", "")), 1)
                        result[q] = int(num) if num == int(num) else num
                    except:
                        pass
    return result

def extract_numerator_denominator(data, label, year):
    label = label.strip().lower()
    result = {}
    for q in QUARTERS:
        if year == 2025 and q in ["Q3", "Q4"]:
            result[q] = None
        else:
            result[q] = {"num": 0, "den": 0}

    for row in data:
        contents = ""
        for key in row:
            if key.strip().lower() in ["contents", "annexure m contents", "type of cases", "type of ccses"]:
                contents = str(row[key]).strip().lower()
                break
        if contents == label:
            for q, qtext in zip(QUARTERS, ["I", "II", "III", "IV"]):
                col = f"{qtext} Qtr-{year}"
                val = row.get(col)
                try:
                    val_num = round(float(str(val).replace(",", "")), 1)
                    result[q] = int(val_num) if val_num == int(val_num) else val_num
                except:
                    continue
    return result

def process_tb_quarters():
    for cat, cfg in INPUTS.items():
        clear_folder(cfg["output_dir"])
        output_data = {}

        for year in YEARS:
            folder = os.path.join(cfg["folder"], f"district_wise_{year}")
            if not os.path.exists(folder):
                print(f"⚠️ Skipping missing folder: {folder}")
                continue

            for file in os.listdir(folder):
                if not file.endswith(".json"):
                    continue
                place = file.replace(".json", "")
                path = os.path.join(folder, file)

                try:
                    with open(path, 'r') as f:
                        data = json.load(f)
                except Exception as e:
                    print(f"❌ Error reading {path}: {e}")
                    continue

                if place not in output_data:
                    output_data[place] = {}
                if cat in ["PRETB", "TB"]:
                    output_data[place][str(year)] = extract_quarter_data(data, cfg["label"], year)
                elif cat in ["NSP", "RT"]:
                    num_qtr = extract_numerator_denominator(data, cfg["numerator"], year)
                    den_qtr = extract_numerator_denominator(data, cfg["denominator"], year)
                    result = {}
                    for q in QUARTERS:
                        if year == 2025 and q in ["Q3", "Q4"]:
                            result[q] = None
                        else:
                            num = num_qtr[q] if isinstance(num_qtr[q], (int, float)) else 0
                            den = den_qtr[q] if isinstance(den_qtr[q], (int, float)) else 0
                            if den == 0:
                                result[q] = 0
                            else:
                                percent = round((num / den) * 100, 1)
                                result[q] = int(percent) if percent == int(percent) else percent
                    output_data[place][str(year)] = result

        for place, yearly in output_data.items():
            short = OUTPUT_FILE_NAMES.get(place, place)
            with open(os.path.join(cfg["output_dir"], f"{short}.json"), 'w') as f:
                json.dump(yearly, f, indent=4)
            print(f"✅ Saved: {cat} => {short}.json")

if __name__ == "__main__":
    process_tb_quarters()
