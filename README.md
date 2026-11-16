# DFIT JSON Updater

## Install (Windows)

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```powershell
streamlit run app.py
```

## Use

1. Set the DFIT project root to the `DFIT` folder (the one containing `HOSPITAL`, `TB_Annexure`, `TB_Case_Finding` and `TB_Outcomes`).
2. Confirm or edit each destination path.
3. Upload the Excel workbook and JSON template for each converter.
4. Click **RUN JSON UPDATE**.
5. Review the preview, then tick the confirmation checkbox to write files.

## Default destination paths

- Leprosy: `HOSPITAL/district_wise_2026`
- TB Annexure: `TB_Annexure`
- TB Case Finding: `TB_Case_Finding`
- TB Outcomes: `TB_Outcomes`

If any TB folder has a nested district JSON folder, edit that destination path in the app before running.

## Safety

- All workbooks and templates are validated before writing.
- Existing matching JSON files are copied to `BACKUPS/json_update_<timestamp>/` first.
- District worksheet names match JSON filenames case-insensitively, ignoring punctuation and spaces.
- If no matching existing JSON is found, that worksheet is skipped; no new district JSON is created.
- Files are written via a temporary file followed by atomic replacement.
