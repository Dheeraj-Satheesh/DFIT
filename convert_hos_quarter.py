import os
import json

YEARS = list(range(2020, 2026))
QUARTERS = ["Q1", "Q2", "Q3", "Q4"]
INPUT_BASE = "HOSPITAL"

OUTPUT_FILE_NAMES = {
    "total_projects": "tp", "dfit_projects": "dfit", "supported_projects": "sup",
    "nellore": "nel", "delhi": "del", "dos": "dos", "polambakam": "pol",
    "dhanbad": "dan", "amda": "amd", "arasipalyam": "ars", "fathimnagar": "fat",
    "nagepalli": "nag", "pavagada": "pav", "belatanr": "bel", "popejohngarden": "pop",
    "chilakalapalli": "chi", "trivendrum": "tri", "andipatti": "and", "ambalamoola": "amb"
}

CATEGORIES = {
    "OPD": {
        "labels": ["total opd treated"],
        "output": "OUTPUT_QTR/OPD"
    },
    "LEPROSY": {
        "labels": ["total new leprosy cases detected"],
        "output": "OUTPUT_QTR/LEPROSY"
    },
    "DISABILITY": {
        "labels": ["total adult g-ii-d cases", "total child g-ii-d cases"],
        "output": "OUTPUT_QTR/DISABILITY"
    },
    "LEPRA": {
        "labels": ["total type-1 lepra reaction cases", "total type-2 lepra reaction cases"],
        "output": "OUTPUT_QTR/LEPRA"
    },
    "RCS": {
        "labels": ["major rcs done"],
        "output": "OUTPUT_QTR/RCS"
    },
    "LEPAD": {
        "labels": ["total leprosy cases admitted"],
        "output": "OUTPUT_QTR/LEPAD"
    },
    "LEPBED": {
        "labels": ["total beddays for leprosy cases"],
        "output": "OUTPUT_QTR/LEPBED"
    },
    "LEPBEDRATE": {
        "labels": ["bed occupancy rate for leprosy cases"],
        "output": "OUTPUT_QTR/LEPBEDRATE"
    }
}

def extract_quarter_data(filepath, year):
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to read {filepath}: {e}")
        return {}

    result = {}
    for row in data:
        content = (row.get("Contents") or "").strip().lower()
        for cat, config in CATEGORIES.items():
            if content in config["labels"]:
                for i, Qtr in enumerate(["I", "II", "III", "IV"]):
                    key_variants = [
                        f"{Qtr} Qtr-{year}",
                        f"{Qtr} Qtr- {year}",
                        f"{Qtr} Qtr -{year}",
                        f"{Qtr} Qtr - {year}"
                    ]
                    val = None
                    for key in key_variants:
                        if key in row:
                            val = row[key]
                            break

                    # Handle missing/invalid values
                    if val == "" or val is None:
                        val = None if year == 2025 and i >= 2 else 0
                    else:
                        try:
                            val = float(str(val).replace(",", ""))
                            val = round(val, 1) if not val.is_integer() else int(val)
                        except:
                            val = 0

                    # Accumulate value if already exists (multi-label case)
                    result.setdefault(cat, {}).setdefault(year, {}).setdefault(QUARTERS[i], 0)
                    if val is not None:
                        result[cat][year][QUARTERS[i]] += val
    return result


def process_quarter_data():
    for cat in CATEGORIES:
        out_dir = CATEGORIES[cat]["output"]
        os.makedirs(out_dir, exist_ok=True)
        for file in os.listdir(out_dir):
            os.remove(os.path.join(out_dir, file))

    combined_data = {cat: {} for cat in CATEGORIES}

    for year in YEARS:
        folder = os.path.join(INPUT_BASE, f"district_wise_{year}")
        if not os.path.exists(folder):
            print(f"⚠️ Skipping missing folder: {folder}")
            continue

        for filename in os.listdir(folder):
            if not filename.endswith(".json"):
                continue
            place = filename.replace(".json", "")
            fpath = os.path.join(folder, filename)
            extracted = extract_quarter_data(fpath, year)

            for cat, ydata in extracted.items():
                for y, qdata in ydata.items():
                    if place not in combined_data[cat]:
                        combined_data[cat][place] = {}
                    if str(y) not in combined_data[cat][place]:
                        combined_data[cat][place][str(y)] = {q: (None if y == 2025 and q in ["Q3", "Q4"] else 0) for q in QUARTERS}
                    combined_data[cat][place][str(y)].update(qdata)

    for cat, places in combined_data.items():
        out_dir = CATEGORIES[cat]["output"]
        for place, data in places.items():
            output_json = {}
            for y in YEARS:
                ystr = str(y)
                output_json[ystr] = data.get(ystr, {q: (None if y == 2025 and q in ["Q3", "Q4"] else 0) for q in QUARTERS})
            shortname = OUTPUT_FILE_NAMES.get(place, place)
            with open(os.path.join(out_dir, f"{shortname}.json"), 'w') as f:
                json.dump(output_json, f, indent=4)
            print(f"✅ Saved: {os.path.join(out_dir, f'{shortname}.json')}")

if __name__ == "__main__":
    process_quarter_data()
