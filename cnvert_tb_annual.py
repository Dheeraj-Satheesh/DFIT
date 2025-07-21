import os
import json

YEARS = list(range(2014, 2026))

# Input folder configurations
INPUTS = {
    "PRETB": {
        "folder": "TB_Annexure",
        "label": "presumptive ds tb examined for diagnosis",
        "output_dir": "OUTPUT/PRETB"
    },
    "TB": {
        "folder": "TB_Case_Finding",
        "label": "grand total",
        "output_dir": "OUTPUT/TB"
    },
    "NSP": {
        "folder": "TB_Outcomes",
        "numerator": "nsp cured",
        "denominator": "nsp total",
        "output_dir": "OUTPUT/NSP"
    },
    "RT": {
        "folder": "TB_Outcomes",
        "numerator": "rt +ve cured",
        "denominator": "rt +ve total",
        "output_dir": "OUTPUT/RT"
    }
}

# Short names for output file names
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

# Human-readable display names
PLACE_LABELS = {
    "andipatti": "Andipatti Project",
    "amda": "Amda Project",
    "ambalamoola": "Ambalamoola Project",
    "arasipalyam": "Arasipalyam Project",
    "belatanr": "Belatanr Project",
    "chilakalapalli": "Chilakalapalli Project",
    "delhi": "Delhi Project",
    "dhanbad": "Dhanbad Project",
    "dos": "DOS Hospital Project",
    "fathimnagar": "Fathimnagar Project",
    "nagepalli": "Nagepalli Project",
    "nellore": "Nellore Project",
    "pavagada": "Pavagada Project",
    "polambakam": "Polambakkam Rehabilitation Centre",
    "popejohngarden": "Pope John Garden Project",
    "supported_projects": "Supported Projects",
    "total_projects": "Total Projects",
    "trivendrum": "Trivendrum Project",
    "dfit_projects": "DFIT Projects"
}

# Extract values from file based on normalized key matching
def extract_value(data, year, match_label):
    match_label = match_label.strip().lower()
    total = 0
    for row in data:
        contents = ""
        for key in row:
            if key.strip().lower() in ["contents", "annexure m contents", "type of cases", "type of ccses"]:
                contents = str(row[key]).strip().lower()
                break
        if contents == match_label:
            val = row.get(f"Annual {year}") or row.get(f"Total {year}") or row.get("Total")
            try:
                total += float(str(val).replace(",", ""))
            except:
                total += 0
    return total

# Clean output directory
def clear_folder(folder_path):
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    else:
        for file in os.listdir(folder_path):
            if file.endswith(".json"):
                os.remove(os.path.join(folder_path, file))

# Process all input configurations
def process_tb_sources():
    for category, cfg in INPUTS.items():
        output_data = {}

        # Clear old output files
        clear_folder(cfg["output_dir"])

        for year in YEARS:
            folder = os.path.join(cfg["folder"], f"district_wise_{year}")
            if not os.path.exists(folder):
                print(f"⚠️ Missing folder {folder}")
                continue

            for filename in os.listdir(folder):
                if not filename.endswith(".json"):
                    continue

                place = filename.replace(".json", "")
                filepath = os.path.join(folder, filename)

                try:
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                except Exception as e:
                    print(f"❌ Error reading {filepath}: {e}")
                    continue

                # Handle different input types
                if category in ["PRETB", "TB"]:
                    total = extract_value(data, year, cfg["label"])
                    val = round(float(total), 1)
                    val_str = str(int(val)) if val == int(val) else f"{val:.1f}"

                elif category in ["NSP", "RT"]:
                    num = extract_value(data, year, cfg["numerator"])
                    den = extract_value(data, year, cfg["denominator"])
                    if den == 0:
                        val_str = "0"
                    else:
                        percent = round((num / den) * 100, 1)
                        val_str = str(int(percent)) if percent == int(percent) else f"{percent:.1f}"

                else:
                    continue

                if place not in output_data:
                    output_data[place] = {}
                output_data[place][str(year)] = val_str

        # Save output
        for place, values in output_data.items():
            values["Contents"] = PLACE_LABELS.get(place, place.capitalize() + " Project")
            shortname = OUTPUT_FILE_NAMES.get(place, place)
            output_path = os.path.join(cfg["output_dir"], f"{shortname}.json")
            with open(output_path, 'w') as f:
                json.dump([values], f, indent=4)
            print(f"✅ {category}: Saved {output_path}")

# Run
if __name__ == "__main__":
    process_tb_sources()
