import os
import json

YEARS = list(range(2014, 2026))
INPUT_BASE = "HOSPITAL"

# Output short names for each place
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
    "delhi": "Delhi Hospital Project",
    "dhanbad": "Dhanbad Project",
    "dos": "DOS Hospital Project",
    "fathimnagar": "Fathimnagar Project",
    "nagepalli": "Nagepalli Project",
    "nellore": "Nellore Hospital Project",
    "pavagada": "Pavagada Project",
    "polambakam": "Polambakkam Rehabilitation Centre",
    "popejohngarden": "Pope John Garden Project",
    "supported_projects": "Supported Projects",
    "total_projects": "All Projects",
    "trivendrum": "Trivendrum Project",
    "dfit_projects": "DFIT Projects"
}

# All categories to extract
CATEGORIES = {
    "OPD": {
        "labels": ["total opd treated"],
        "output": "OUTPUT/OPD"
    },
    "LEPROSY": {
        "labels": ["total new leprosy cases detected"],
        "output": "OUTPUT/LEPROSY"
    },
    "DISABILITY": {
        "labels": ["total adult g-ii-d cases", "total child g-ii-d cases"],
        "output": "OUTPUT/DISABILITY"
    },
    "LEPRA": {
        "labels": ["total type-1 lepra reaction cases", "total type-2 lepra reaction cases"],
        "output": "OUTPUT/LEPRA"
    },
    "RCS": {
        "labels": ["major rcs done"],
        "output": "OUTPUT/RCS"
    },
    "LEPAD": {
        "labels": ["total leprosy cases admitted"],
        "output": "OUTPUT/LEPAD"
    },
    "LEPBED": {
        "labels": ["total beddays for leprosy cases"],
        "output": "OUTPUT/LEPBED"
    },
    "LEPBEDRATE": {
        "labels": ["bed occupancy rate for leprosy cases"],
        "output": "OUTPUT/LEPBEDRATE"
    }
}

# Store cumulative yearly totals
merged_data = {cat: {} for cat in CATEGORIES}

# Extracts values from one file
def extract_values(path, year):
    try:
        with open(path, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Error reading {path}: {e}")
        return {}

    result = {}
    for row in data:
        row_content = (row.get("Contents") or "").strip().lower()
        for cat, config in CATEGORIES.items():
            if row_content in config["labels"]:
                val = row.get(f"Annual {year}") or row.get(f"Total {year}") or row.get("Total")
                if val is None or str(val).strip() == "":
                    val = "0"
                result.setdefault(cat, {}).setdefault(row_content, 0)
                try:
                    result[cat][row_content] += float(str(val).replace(",", ""))
                except:
                    result[cat][row_content] += 0
    return result

# Main processor
def process_all_years():
    # 🔁 Clean output folders
    for cat in CATEGORIES:
        output_dir = CATEGORIES[cat]["output"]
        if os.path.exists(output_dir):
            for file in os.listdir(output_dir):
                fpath = os.path.join(output_dir, file)
                if os.path.isfile(fpath):
                    os.remove(fpath)

    # 🔁 Reset merged data
    global merged_data
    merged_data = {cat: {} for cat in CATEGORIES}

    # 🔁 Process each year + file
    for year in YEARS:
        folder = os.path.join(INPUT_BASE, f"district_wise_{year}")
        if not os.path.isdir(folder):
            print(f"⚠️ Skipped missing folder: {folder}")
            continue

        for filename in os.listdir(folder):
            if not filename.endswith(".json"):
                continue

            place = filename.replace(".json", "")
            input_path = os.path.join(folder, filename)
            values = extract_values(input_path, year)

            for cat, yearly_data in values.items():
                total_for_year = sum(yearly_data.values())
                if place not in merged_data[cat]:
                    merged_data[cat][place] = {}
                merged_data[cat][place][str(year)] = str(int(total_for_year))

    # 🔁 Write output files
    for cat, places in merged_data.items():
        output_dir = CATEGORIES[cat]["output"]
        os.makedirs(output_dir, exist_ok=True)
        for place, values in places.items():
            values["Contents"] = PLACE_LABELS.get(place, place.capitalize() + " Project")
            shortname = OUTPUT_FILE_NAMES.get(place, place)
            out_path = os.path.join(output_dir, f"{shortname}.json")
            with open(out_path, 'w') as f:
                json.dump([values], f, indent=4)
            print(f"✅ Saved: {out_path}")

# Run if main
if __name__ == "__main__":
    process_all_years()
