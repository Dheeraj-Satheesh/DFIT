import os
import json
from datetime import datetime

# INPUT CONFIG
INPUTS = {
    "medical_officers": {
        "file_prefix": "MO",
        "content": "Number of Medical officers Participated",
        "output_dir": "DRTB TRAINING-GRAPH/MO"
    },
    "paramedical": {
        "file_prefix": "PM",
        "content": "Number of Para Medical staffs Participated",
        "output_dir": "DRTB TRAINING-GRAPH/PM"
    },
    "asha": {
        "file_prefix": "ASHA",
        "content": "Number of ASHAs Participated",
        "output_dir": "DRTB TRAINING-GRAPH/ASHA"
    },
    "total_staffs": {
        "file_prefix": "TOTAL",
        "content": "Total Staffs Participated",
        "output_dir": "DRTB TRAINING-GRAPH/TOTAL"
    }
}

STATE_NAME_MAP = {

    "bihar": "Bihar State",
}

YEARS = ["2020", "2021", "2022", "2023", "2024"]

# FOLDER where your raw DRTB jsons are
INPUT_FOLDER = "DRTB Trainings"

# --- Main Processing ---
for category, info in INPUTS.items():
    output_dir = info["output_dir"]
    content_str = info["content"]

    os.makedirs(output_dir, exist_ok=True)

    # Clean previous outputs
    for old_file in os.listdir(output_dir):
        if old_file.endswith(".json"):
            os.remove(os.path.join(output_dir, old_file))

    # Loop through each state JSON
    for filename in os.listdir(INPUT_FOLDER):
        if filename.endswith(".json"):
            state_code = filename.replace(".json", "")
            state_label = STATE_NAME_MAP.get(state_code, state_code.capitalize())

            with open(os.path.join(INPUT_FOLDER, filename), "r") as f:
                data = json.load(f)

            # Find the row with the right "Contents"
            entry = next(
                (d for d in data if d.get("Contents", "").strip().lower() == content_str.lower()),
                None
            )

            if entry:
                entry_result = {
                    "Contents": f"{state_label} Training - {content_str}",
                }
                for year in YEARS:
                    entry_result[year] = entry.get(year, "0")

                output_path = os.path.join(output_dir, f"{state_code}.json")
                with open(output_path, "w") as out_file:
                    json.dump([entry_result], out_file, indent=2)

                print(f"[✔] Saved: {output_path}")
            else:
                print(f"[!] Missing '{content_str}' in {filename}")
