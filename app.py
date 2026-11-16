from __future__ import annotations
import io, json, re, shutil, tempfile, zipfile
from pathlib import Path
from datetime import datetime
import streamlit as st
from openpyxl import load_workbook

PIPELINES = [
    {"key":"leprosy","label":"Leprosy","folder_hint":"","excel_key":"leprosy"},
    {"key":"annexure","label":"TB Annexure M","folder_hint":"TB_Annexure","excel_key":"annexure"},
    {"key":"case_finding","label":"TB Case Finding","folder_hint":"TB_Case_Finding","excel_key":"case_finding"},
    {"key":"outcomes","label":"TB Outcomes","folder_hint":"TB_Outcomes","excel_key":"outcomes"},
]

# Worksheet-name aliases are mapped to the existing production JSON stems.
# The destination filename is always taken from production, never generated from a sheet name.
ALIASES = {
    "leprosy": {
        "totalallprojects":"total_projects", "totalprojects":"total_projects",
        "dfitprojects":"dfit_projects", "supporteprojects":"supported_projects",
        "supportedprojects":"supported_projects", "nellore":"nellore", "delhi":"delhi",
        "dos":"dos", "polambakkam":"polambakam", "polambakam":"polambakam",
        "dhanbad":"dhanbad", "amda":"amda", "arasipalyam":"arasipalyam",
        "fathimanagar":"fathimnagar", "fathimnagar":"fathimnagar",
        "pavagada":"pavagada", "nagepalli":"nagepalli",
    },
    "annexure": {
        "totaltbprojects":"total_projects", "totalprojects":"total_projects",
        "dfitprojects":"dfit_projects", "supportedprojects":"supported_projects",
        "supporteprojects":"supported_projects", "nellore":"nellore", "delhi":"delhi",
        "pavagada":"pavagada", "arasipalyam":"arasipalyam",
        "fathimanagar":"fathimnagar", "fathimnagar":"fathimnagar",
    },
    "case_finding": {
        "totaldfitprojectstbreport":"total_projects", "totalprojectstbreport":"total_projects",
        "dfitprojectstbreport":"dfit_projects", "supportedprojectstbreport":"supported_projects",
        "nelloretb":"nellore", "delhitb":"delhi", "arasipalyamtb":"arasipalyam",
        "pavagadatb":"pavagada", "fathimanagartb":"fathimnagar",
    },
    "outcomes": {
        "totalprojectstboutcome":"total_projects", "dfitprojectstboutcome":"dfit_projects",
        "supportedprojectstboutcome":"supported_projects", "nelloretboutcome":"nellore",
        "delhitboutcome":"delhi", "arasiplyamtboutcome":"arasipalyam",
        "arasipalyamtboutcome":"arasipalyam", "pavagadatboutocme":"pavagada",
        "pavagadatboutcome":"pavagada", "fathimanagartboutcome":"fathimnagar",
    },
}

def norm(v):
    return re.sub(r"[^a-z0-9]", "", str(v or "").strip().lower())

def val(v):
    if v is None: return ""
    if isinstance(v, float) and v.is_integer(): return str(int(v))
    return str(v).strip()

def cell_value(ws, row, col, fallback=""):
    cell = ws.cell(row, col)
    raw = cell.value
    marker = str(raw).strip() if raw is not None else ""

    # Compare the actual cell value only. Do not use Excel number formats,
    # decimal display precision, percentage formatting, or other visual formatting.
    # Treat 0, blank, dash, and Excel errors as placeholders and retain the
    # corresponding value already present in the JSON template.
    is_zero = isinstance(raw, (int, float)) and not isinstance(raw, bool) and raw == 0
    is_zero_text = marker == "0"
    if (
        raw is None
        or marker in {"", "-"}
        or is_zero
        or is_zero_text
        or getattr(cell, "data_type", None) == "e"
        or marker.startswith("#")
    ):
        return fallback

    if isinstance(raw, bool):
        return str(raw)
    return str(raw).strip()

def percentage_value(ws, row, col, fallback=""):
    cell = ws.cell(row, col)
    raw = cell.value
    marker = str(raw).strip() if raw is not None else ""
    is_zero = isinstance(raw, (int, float)) and not isinstance(raw, bool) and raw == 0
    if (
        raw is None or marker in {"", "-", "0"} or is_zero
        or getattr(cell, "data_type", None) == "e" or marker.startswith("#")
    ):
        return fallback
    try:
        fmt = str(cell.number_format or "General").split(";")[0].strip()
        clean = re.sub(r'"[^"]*"|\\\\.|\\[[^]]*\\]', "", fmt)
        decimals = 0
        if "." in clean:
            decimal_part = clean.split(".", 1)[1]
            decimal_part = re.split(r"[^0#?]", decimal_part, 1)[0]
            decimals = len(decimal_part)

        if isinstance(raw, str):
            value = float(raw.strip().replace("%", "").replace(",", ""))
        else:
            value = float(raw)
            # Excel percentage fractions (e.g. 0.445 with 0.0%) become 44.5.
            if "%" in fmt and abs(value) <= 1:
                value *= 100

        # Respect each workbook/cell's displayed precision:
        # 0 -> 87, 0.0 -> 44.5, 0.00 -> 44.49.
        return f"{value:.{decimals}f}"
    except (TypeError, ValueError):
        return fallback


def normalized_json(value):
    # Ignore whitespace-only differences in JSON string values when deciding
    # whether a file has a real data change. Dictionary keys and data types stay exact.
    if isinstance(value, dict):
        return {k: normalized_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [normalized_json(v) for v in value]
    if isinstance(value, str):
        return re.sub(r"\\s+", " ", value).strip()
    return value

def qnum(v):
    s=norm(v)
    s=re.sub(r"20\d{2}", "", s)
    m=re.fullmatch(r"(?:(?:qtr|quarter)(i{1,3}|iv|[1-4])|(i{1,3}|iv|[1-4])(?:qtr|quarter))",s)
    if not m: return None
    return {"i":1,"ii":2,"iii":3,"iv":4,"1":1,"2":2,"3":3,"4":4}.get(m.group(1) or m.group(2))

def load_json(path):
    data=json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(data,list) or not data or not all(isinstance(x,dict) for x in data):
        raise ValueError(f"Invalid production JSON array: {path.name}")
    return data

def schema_kind(data):
    if not isinstance(data,list) or not data or not isinstance(data[0],dict): return None
    keys={norm(k) for k in data[0]}
    if len(data)==70 and "sno" in keys and "contents" in keys: return "leprosy"
    if len(data)==10 and "annexuremcontents" in keys: return "annexure"
    if len(data)==21 and "typeofcases" in keys: return "case_finding"
    if len(data)==32 and "typeofcases" in keys and "%" in data[0]: return "outcomes"
    return None

def find_reference_folder(root, pipeline_key):
    kind=pipeline_key
    folders=[]
    for folder in root.rglob("*"):
        if not folder.is_dir(): continue
        if pipeline_key!="leprosy" and folder_hint_for(pipeline_key).lower() not in str(folder).lower():
            continue
        count=0; year=0
        for f in folder.glob("*.json"):
            try:
                d=load_json(f)
                if schema_kind(d)==kind: count+=1
            except Exception: pass
        if count>=2:
            m=re.search(r"(20\d{2})",folder.name)
            year=int(m.group(1)) if m else 0
            folders.append((year,count,folder))
    if not folders:
        raise ValueError(f"Could not find an existing production folder for {pipeline_key}.")
    folders.sort(key=lambda x:(x[0],x[1]),reverse=True)
    return folders[0][2]

def folder_hint_for(key):
    return {"annexure":"TB_Annexure","case_finding":"TB_Case_Finding","outcomes":"TB_Outcomes"}.get(key,"")

def destination_folder(source, year):
    return source.parent / f"district_wise_{year}"

def find_prod_file(source, stem):
    for f in source.glob("*.json"):
        if norm(f.stem)==norm(stem):
            return f
    return None

def update_year_keys(template, year):
    out=[]
    for row in template:
        new={}
        for k,v in row.items():
            nk=re.sub(r"20\d{2}",str(year),k)
            new[nk]=v
        out.append(new)
    return out

def leprosy_convert(ws, template):
    first=template[0]
    qkeys={qnum(k):k for k in first if qnum(k)}
    annual=next((k for k in first if norm(k).startswith("annual")),None)
    header=None; cols={}
    for r in range(1,min(20,ws.max_row)+1):
        found={"sno":None,"q":{},"annual":None}
        for c in range(1,ws.max_column+1):
            x=ws.cell(r,c).value; n=norm(x); q=qnum(x)
            if n in {"sno","serialno","serialnumber"}: found["sno"]=c
            if q: found["q"][q]=c
            if n.startswith("annual"): found["annual"]=c
        if found["sno"]:
            header,cols=r,found; break
    if not header: raise ValueError(f"{ws.title}: S.NO header not found.")
    excel={}
    for r in range(header+1,ws.max_row+1):
        k=norm(ws.cell(r,cols["sno"]).value)
        if k: excel[k]=r
    out=[]; missing=[]
    for row in template:
        r=excel.get(norm(row.get("S.NO")))
        new=dict(row)
        if not r: missing.append(row.get("S.NO"))
        else:
            desc_col = next((c for c in range(1, ws.max_column + 1)
                             if norm(ws.cell(header, c).value) in {"contents", "type of cases", "type of case"}), 2)
            desc = norm(ws.cell(r, desc_col).value)
            is_percentage_metric = any(token in desc for token in ("rate", "percentage", "percent", "conversion", "%"))
            for q,k in qkeys.items():
                if q in cols["q"]:
                    if is_percentage_metric:
                        new[k]=percentage_value(ws,r,cols["q"][q],new.get(k, ""))
                    else:
                        new[k]=cell_value(ws,r,cols["q"][q],new.get(k, ""))
            if annual and cols["annual"]:
                if is_percentage_metric:
                    new[annual]=percentage_value(ws,r,cols["annual"],new.get(annual, ""))
                else:
                    new[annual]=cell_value(ws,r,cols["annual"],new.get(annual, ""))
        out.append(new)
    return out,missing

def standard_convert(ws, template):
    first=template[0]
    qkeys={qnum(k):k for k in first if qnum(k)}
    total_key=next((k for k in first if norm(k).startswith(("total","annual"))),None)
    if len(qkeys)!=4 or not total_key: raise ValueError("Production JSON template has incomplete quarter/total keys.")
    header=None; qcols={}; total_col=None; desc_col=None
    for r in range(1,ws.max_row+1):
        qs={}; total=None
        for c in range(1,ws.max_column+1):
            x=ws.cell(r,c).value; q=qnum(x)
            if q: qs[q]=c
            if norm(x).startswith(("total","annual")): total=c
        if len(qs)==4 and total:
            header=r; qcols=qs; total_col=total; desc_col=min(qs.values())-1; break
    if not header or desc_col<1: raise ValueError(f"{ws.title}: quarter/total header row not found.")
    rows=[r for r in range(header+1,ws.max_row+1) if cell_value(ws,r,desc_col)]
    if len(rows)!=len(template):
        raise ValueError(f"{ws.title}: {len(rows)} Excel metric rows but production JSON has {len(template)}.")
    out=[]
    for old,r in zip(template,rows):
        new=dict(old)
        desc = norm(ws.cell(r, desc_col).value)
        is_percentage_metric = any(token in desc for token in ("rate", "percentage", "percent", "conversion", "%"))
        for q,k in qkeys.items():
            if is_percentage_metric:
                new[k]=percentage_value(ws,r,qcols[q],new.get(k, ""))
            else:
                new[k]=cell_value(ws,r,qcols[q],new.get(k, ""))
        if is_percentage_metric:
            new[total_key]=percentage_value(ws,r,total_col,new.get(total_key, ""))
        else:
            new[total_key]=cell_value(ws,r,total_col,new.get(total_key, ""))
        out.append(new)
    return out,[]

def outcomes_convert(ws, template):
    if len(template)!=32: raise ValueError("TB Outcomes production JSON must contain 32 records.")
    # Read columns by quarter heading, not fixed positions, while retaining the production key names.
    header=None; qcols={}; total_col=None; pct_col=None
    for r in range(1,min(8,ws.max_row)+1):
        qs={}; total=None; pct=None
        for c in range(1,ws.max_column+1):
            x=ws.cell(r,c).value; q=qnum(x); n=norm(x)
            if q: qs[q]=c
            if n.startswith("total"): total=c
            if str(x or "").strip()=="%": pct=c
        if len(qs)==4 and total and pct:
            header=r; qcols=qs; total_col=total; pct_col=pct; break
    if not header: raise ValueError(f"{ws.title}: outcome quarter, total and % headings not found.")
    qkeys={qnum(k):k for k in template[0] if qnum(k)}
    total_key=next((k for k in template[0] if norm(k).startswith("total")),None)
    pct_key=next((k for k in template[0] if norm(k)=="%"),None)
    out=[]
    for i,old in enumerate(template):
        r=header+1+i
        # Ignore invalid placeholder keys accidentally present in an existing
        # target-year JSON file. In particular, never write a literal "null" key.
        new={k:v for k,v in old.items()
             if k is not None and str(k).strip().lower() not in {"", "null", "none"}}
        for q,k in qkeys.items(): new[k]=cell_value(ws,r,qcols[q],new.get(k, ""))
        new[total_key]=cell_value(ws,r,total_col,new.get(total_key, ""))
        new[pct_key]=percentage_value(ws,r,pct_col,new.get(pct_key, ""))
        out.append(new)
    return out,[]


def remove_invalid_json_keys(value):
    """Remove invalid placeholder keys from dictionaries at every nesting level."""
    if isinstance(value, dict):
        cleaned = {}
        for key, item in value.items():
            if key is None or str(key).strip().lower() in {"", "null", "none"}:
                continue
            cleaned[key] = remove_invalid_json_keys(item)
        return cleaned
    if isinstance(value, list):
        return [remove_invalid_json_keys(item) for item in value]
    return value


def target_matches_data(target, data):
    """Return True when the existing target already contains the planned JSON data."""
    if not target.exists():
        return False
    try:
        current = json.loads(target.read_text(encoding="utf-8-sig"))
    except Exception:
        return False
    return normalized_json(current) == normalized_json(data)


def write_json_preserving_style(target, data):
    data = remove_invalid_json_keys(data)
    raw = target.read_text(encoding="utf-8-sig") if target.exists() else ""
    newline = "\r\n" if "\r\n" in raw else "\n"
    indent = 4
    if raw:
        match = re.search(r"(?m)^( +)\{\s*$", raw)
        if match:
            indent = max(1, len(match.group(1)))
        else:
            key_match = re.search(r'(?m)^( +)"[^"\n]+"\s*:', raw)
            if key_match:
                indent = max(1, len(key_match.group(1)) - 4)
    rendered = json.dumps(data, ensure_ascii=False, indent=indent)
    if newline != "\n":
        rendered = rendered.replace("\n", newline)
    if raw.endswith(("\n", "\r\n")) or not raw:
        rendered += newline
    target.write_text(rendered, encoding="utf-8", newline="")

def process_pipeline(root, pipeline, excel_bytes, year):
    source=find_reference_folder(root,pipeline["key"])
    dest=destination_folder(source,year)
    wb=load_workbook(io.BytesIO(excel_bytes),data_only=True)
    alias=ALIASES[pipeline["key"]]
    plans=[]; seen=set()
    for ws in wb.worksheets:
        sheet_key=norm(ws.title)
        prod_stem=alias.get(sheet_key)
        if not prod_stem:
            raise ValueError(f"Worksheet '{ws.title}' has no approved production filename mapping.")
        if prod_stem in seen:
            raise ValueError(f"More than one worksheet maps to '{prod_stem}.json'.")
        seen.add(prod_stem)
        source_file=find_prod_file(source,prod_stem)
        if not source_file:
            raise ValueError(f"Production file '{prod_stem}.json' not found in {source}.")
        original=load_json(source_file)
        target=dest/source_file.name
        # Existing target-year JSON is the fallback for Excel error cells.
        # If no target exists yet, use the production template with year-adjusted keys.
        template=load_json(target) if target.exists() else update_year_keys(original,year)
        if pipeline["key"]=="leprosy":
            data,missing=leprosy_convert(ws,template)
        elif pipeline["key"]=="outcomes":
            data,missing=outcomes_convert(ws,template)
        else:
            data,missing=standard_convert(ws,template)
        data = remove_invalid_json_keys(data)
        plans.append({"worksheet":ws.title,"source_name":source_file.name,"target":target,
                      "data":data,"missing":missing,"records":len(data),"target_exists":target.exists()})
    wb.close()
    return source,dest,plans

def zip_folder(root, output):
    with zipfile.ZipFile(output,"w",zipfile.ZIP_DEFLATED) as z:
        for p in root.rglob("*"):
            if p.is_file():
                z.write(p,p.relative_to(root.parent))

st.set_page_config(page_title="DFIT Excel to Production JSON",layout="wide")
st.title("DFIT Excel → Production JSON Updater")
st.caption("Build: 2026-11-16 | Invalid JSON placeholder-key cleanup enabled")
st.write("Select your existing extracted production folder, then upload the four Excel workbooks. JSON files are written directly into that folder. No production ZIP upload or output ZIP is required.")
st.caption("Existing JSON array/object structure, keys, record order, and values are preserved. The Action column shows 'Matched - no write needed' when the target JSON already matches the Excel-derived result; only files that need changes are written.")
root_text=st.text_input(
    "Production project folder (extracted DFIT_New folder)",
    value=str(Path.cwd() / "DFIT_New"),
    help="Enter the permanent path to your extracted production folder. You do not need to upload the production ZIP again."
)
root=Path(root_text).expanduser()
year=st.number_input("Target year",min_value=2000,max_value=2100,value=2026,step=1)
st.subheader("Upload the four Excel workbooks")
col1,col2=st.columns(2)
with col1:
    leprosy=st.file_uploader("Leprosy Excel",type=["xlsx","xlsm"])
    annexure=st.file_uploader("TB Annexure M Excel",type=["xlsx","xlsm"])
with col2:
    case_finding=st.file_uploader("TB Case Finding Excel",type=["xlsx","xlsm"])
    outcomes=st.file_uploader("TB Outcomes Excel",type=["xlsx","xlsm"])
backup=st.checkbox("Keep backups of existing target JSON files inside BACKUPS",value=True)
if st.button("MATCH, VALIDATE & PREVIEW",type="primary",use_container_width=True):
    uploads={"leprosy":leprosy,"annexure":annexure,"case_finding":case_finding,"outcomes":outcomes}
    if not root.is_dir():
        st.error("The production folder path does not exist. Enter the path to your extracted DFIT_New folder.")
    elif any(v is None for v in uploads.values()):
        st.error("Upload all four Excel workbooks.")
    else:
        allplans={}; errors=[]
        for p in PIPELINES:
            try:
                source,dest,plans=process_pipeline(root,p,uploads[p["excel_key"]].getvalue(),int(year))
                allplans[p["key"]]=(source,dest,plans)
            except Exception as e:
                errors.append(f"{p['label']}: {e}")
        if errors:
            st.error("Validation failed. No files were changed.")
            for e in errors: st.write("• "+e)
        else:
            st.session_state["dfit_root"]=str(root.resolve())
            st.session_state["dfit_plans"]={k:(str(src),str(dst),[{**x,"target":str(x["target"])} for x in plans]) for k,(src,dst,plans) in allplans.items()}
            st.session_state["dfit_backup"]=backup
            st.success("All worksheets matched existing production JSON filenames and passed structural validation.")

if "dfit_plans" in st.session_state:
    st.subheader("One-to-one worksheet → production filename mapping")
    rows=[]
    for p in PIPELINES:
        source,dest,plans=st.session_state["dfit_plans"][p["key"]]
        st.markdown(f"**{p['label']}**: `{Path(dest).relative_to(Path(st.session_state['dfit_root']))}`")
        for x in plans:
            rows.append({"Pipeline":p["label"],"Excel worksheet":x["worksheet"],
                         "Existing production filename":x["source_name"],
                         "Target JSON":str(Path(x["target"]).relative_to(Path(st.session_state["dfit_root"]))),
                         "Action":("Matched - no write needed" if target_matches_data(Path(x["target"]), x["data"])
                                   else "Update existing 2026 file" if x["target_exists"]
                                   else "Create 2026 copy using existing filename"),
                         "JSON records":x["records"],"Unmatched S.NO":", ".join(map(str,x["missing"])) or "-"})
    st.dataframe(rows,use_container_width=True,hide_index=True)
    st.info("The existing target-year JSON is used as the baseline when present. Only valid, non-placeholder Excel values update mapped fields. Numeric/text 0, blank cells, a single hyphen (-), and Excel errors such as #DIV/0! preserve the existing JSON value. Percentage/rate fields are detected from their labels, percentage column headings, and Excel percentage number formats, even when each workbook uses a different style. Values are rounded to whole percentages in quarter and annual/total fields. Whitespace-only differences in JSON values are ignored. Files whose resulting JSON is identical are not rewritten, so unchanged files will not be marked modified in VS Code. Existing JSON records, keys, order, filenames, capitalization, and spelling are retained.")
    if st.checkbox("I confirm the mapping and want to write the updated JSON files into the production folder.",key="dfit_confirm"):
        if st.button("WRITE UPDATED JSON FILES",type="primary",use_container_width=True):
            root=Path(st.session_state["dfit_root"])
            backup_root=root/"BACKUPS"/("json_update_"+datetime.now().strftime("%Y%m%d_%H%M%S"))
            changed=[]; backed=[]
            try:
                for p in PIPELINES:
                    _,_,plans=st.session_state["dfit_plans"][p["key"]]
                    for x in plans:
                        target=Path(x["target"])
                        target.parent.mkdir(parents=True,exist_ok=True)

                        # Do not touch a target file if the resulting JSON data is
                        # identical to its current content. This avoids false
                        # modified-file indicators in VS Code for skipped values.
                        if target.exists():
                            try:
                                current_data=json.loads(target.read_text(encoding="utf-8-sig"))
                            except Exception:
                                current_data=None
                            if current_data is not None and normalized_json(current_data) == normalized_json(x["data"]):
                                continue

                        if target.exists() and st.session_state["dfit_backup"]:
                            bp=backup_root/target.relative_to(root)
                            bp.parent.mkdir(parents=True,exist_ok=True)
                            shutil.copy2(target,bp); backed.append(str(bp.relative_to(root)))
                        tmp=target.with_suffix(target.suffix+".tmp")
                        write_json_preserving_style(target, x["data"])
                        changed.append(str(target.relative_to(root)))
                st.success(f"Changed {len(changed)} JSON files. Unchanged files were not rewritten. Backups created: {len(backed)}.")
                st.write(f"Production folder updated: `{root}`")
                with st.expander("Updated JSON files"):
                    for f in changed: st.write("✓ "+f)
                if backed:
                    with st.expander("Backup files"):
                        for f in backed: st.write("✓ "+f)
            except Exception as e:
                st.exception(e)
