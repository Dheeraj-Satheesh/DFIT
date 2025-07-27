import os
import json

INPUTS = {
    "self_care": {
        "folder": "DPMR",
        "numerator": "number of patients practising self care regularly",
        "denominator": "number of persons affected by leprosy with disabilities visited during the year",
        "output_dir": "DPMR-GRAPH/SC",
        "content": "Practicing self care regularly %"
    },
    "Under treatment": {
        "folder": "DPMR",
        "numerator": "number of under treatment patients taking regular treatment",
        "denominator": "number of under treatment patients visited",
        "output_dir": "DPMR-GRAPH/UT",
        "content": "Under Treatment Patients taking regular treatment %"
    },
    "lepra": {
        "folder": "DPMR",
        "numerator": "number of lepra reaction patients taking regular treatment",
        "denominator": "number of lepra reaction patients visited",
        "output_dir": "DPMR-GRAPH/LEP",
        "content": "Lepra Reactions Patients taking regular treatment %"
    },
    "mcr": {
        "folder": "DPMR",
        "numerator": "number of patients wearing appropriate foot wear regularly",
        "denominator": "number of patients required foot wear",
        "output_dir": "DPMR-GRAPH/MCR",
        "content": "Patients wearing appropriate Footwear regularly %"
    }
}

STATE_NAME_MAP = {
    "ap": "Andhra Pradesh State",
    "bihar": "Bihar State",
    "chat": "Chhattisgarh State",
    "jhar": "Jharkhand State",
    "kar": "Karnataka State",
    "tn": "Tamil Nadu State",
    "tot": "All States"
}

YEARS = ["2020", "2021", "2022", "2023", "2024"]

def find_entry(data, key_name):
    key_name = key_name.strip().lower()
    for entry in data:
        content = entry.get("DPMR Contents", "").strip().lower()
        if key_name == content:
            return entry
    return None

# Main Processing
for category, info in INPUTS.items():
    folder = info["folder"]
    numerator_key = info["numerator"].strip().lower()
    denominator_key = info["denominator"].strip().lower()
    output_dir = info["output_dir"]
    content_str = info["content"]
    os.makedirs(output_dir, exist_ok=True)

    # Delete old .json files in output_dir
    for old_file in os.listdir(output_dir):
        if old_file.endswith(".json"):
            os.remove(os.path.join(output_dir, old_file))

    for filename in os.listdir(folder):
        if filename.endswith(".json"):
            state_code = filename.replace(".json", "")
            state_label = STATE_NAME_MAP.get(state_code, state_code.capitalize())

            with open(os.path.join(folder, filename), 'r') as f:
                data = json.load(f)

            numerator_entry = find_entry(data, numerator_key)
            denominator_entry = find_entry(data, denominator_key)

            if numerator_entry and denominator_entry:
                entry_result = {
                    "Contents": f"{state_label} DPMR Services - {content_str}"
                }
                for year in YEARS:
                    try:
                        num = float(numerator_entry.get(year, "0"))
                        denom = float(denominator_entry.get(year, "0"))
                        percent = round((num / denom) * 100, 1) if denom != 0 else 0.0
                    except:
                        percent = 0.0
                    entry_result[year] = str(percent)

                output_path = os.path.join(output_dir, f"{state_code}.json")
                with open(output_path, 'w') as out_file:
                    json.dump([entry_result], out_file, indent=2)
                print(f"[✔] Saved: {output_path}")
            else:
                print(f"[!] Missing data in {filename} for '{numerator_key}' or '{denominator_key}'")
