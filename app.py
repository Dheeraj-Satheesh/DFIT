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

st.set_page_config(
    page_title="DFIT Data Studio | Excel → JSON",
    page_icon="✦",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');
:root { --ink:#17243b; --muted:#718096; --blue:#3563e9; --cyan:#14b8a6; --line:#e7edf5; }
html, body, [class*="css"] { font-family:'DM Sans',sans-serif; }
.stApp {
  background:
    radial-gradient(ellipse at 8% 0%, rgba(77,126,255,.13), transparent 34%),
    radial-gradient(ellipse at 94% 8%, rgba(20,184,166,.11), transparent 30%),
    #f5f7fb;
}
.block-container { max-width: 1440px; padding-top: 1.4rem; padding-bottom: 4rem; }
#MainMenu, footer { visibility:hidden; }
header[data-testid="stHeader"] { background:transparent; }
.hero {
  position:relative; overflow:hidden; border-radius:26px; padding:30px 34px;
  color:white; background:linear-gradient(115deg,#14264b 0%,#244c9f 56%,#287f91 100%);
  box-shadow:0 18px 45px rgba(28,57,111,.18); margin-bottom:22px;
  animation:rise .65s ease both;
}
.hero:before,.hero:after { content:""; position:absolute; border-radius:50%; pointer-events:none; }
.hero:before { width:270px;height:270px;right:7%;top:-180px;border:1px solid rgba(255,255,255,.2);box-shadow:0 0 0 28px rgba(255,255,255,.035),0 0 0 58px rgba(255,255,255,.025); }
.hero:after { width:170px;height:170px;right:-30px;bottom:-115px;background:rgba(255,255,255,.07); }
.hero-kicker { font-size:11px; letter-spacing:2.3px; font-weight:800; opacity:.72; text-transform:uppercase; }
.hero h1 { font-family:Manrope,sans-serif; font-size:clamp(26px,3.2vw,39px); line-height:1.12; margin:10px 0 9px; font-weight:800; color:white; }
.hero p { margin:0; max-width:760px; color:rgba(255,255,255,.78); font-size:14px; }
.hero-pills { display:flex; flex-wrap:wrap; gap:8px; margin-top:20px; }
.hero-pill { border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.1); border-radius:30px; padding:6px 11px; font-size:11px; font-weight:700; }
.section-heading { font-family:Manrope,sans-serif; color:var(--ink); font-size:20px; font-weight:800; margin:22px 0 4px; }
.section-sub { color:var(--muted); font-size:13px; margin-bottom:14px; }
.panel {
  background:rgba(255,255,255,.88); border:1px solid rgba(224,232,243,.95);
  border-radius:18px; padding:19px 20px; box-shadow:0 7px 24px rgba(31,54,88,.045);
  transition:transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}
.panel:hover { transform:translateY(-2px); box-shadow:0 13px 30px rgba(31,54,88,.08); border-color:#cbd8ed; }
.panel-label { color:#75839a; font-size:11px; font-weight:800; letter-spacing:1.1px; text-transform:uppercase; }
.panel-title { color:var(--ink); font-size:16px; font-weight:800; margin:7px 0 4px; }
.panel-copy { color:#75839a; font-size:12px; line-height:1.5; }
.step-dot { display:inline-flex; width:27px;height:27px;align-items:center;justify-content:center;border-radius:9px;background:#eaf0ff;color:#315bd2;font-size:12px;font-weight:800;margin-right:8px; }
div[data-testid="stFileUploader"] section { background:#f8faff; border:1px dashed #b9c9e3; border-radius:13px; }
div[data-testid="stFileUploader"] section:hover { border-color:#5278e8; background:#f2f6ff; }
div[data-testid="stTextInput"] input, div[data-testid="stNumberInput"] input { border-radius:11px; }
.stButton > button {
  border-radius:12px; border:0; min-height:46px; font-weight:800; letter-spacing:.15px;
  background:linear-gradient(105deg,#315fe5,#267eaa); color:white;
  box-shadow:0 7px 17px rgba(49,95,229,.2); transition:all .2s ease;
}
.stButton > button:hover { transform:translateY(-2px); box-shadow:0 11px 24px rgba(49,95,229,.28); border:0; color:white; }
.stButton > button:active { transform:translateY(0) scale(.99); }
div[data-testid="stCheckbox"] label { color:#35445d; font-size:13px; font-weight:600; }
div[data-testid="stAlert"] { border-radius:13px; }
div[data-testid="stDataFrame"] { border:1px solid var(--line); border-radius:14px; overflow:hidden; }
div[data-testid="stExpander"] { background:white; border:1px solid var(--line); border-radius:13px; }
.metric-card { background:white; border:1px solid var(--line); border-radius:15px; padding:15px 17px; }
.metric-num { color:#1b2b49; font-family:Manrope,sans-serif; font-size:26px; font-weight:800; }
.metric-caption { color:#7b879b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.7px; }
.status-line { display:flex; gap:9px; align-items:center; color:#5c6d86; font-size:12px; }
.pulse { width:8px;height:8px;border-radius:50%;background:#14b8a6;box-shadow:0 0 0 0 rgba(20,184,166,.45);animation:pulse 1.8s infinite; }
.footer-note { text-align:center; color:#9aa5b5; font-size:11px; padding-top:24px; }
@keyframes rise { from {opacity:0;transform:translateY(12px)} to {opacity:1;transform:translateY(0)} }
@keyframes pulse { 70% {box-shadow:0 0 0 8px rgba(20,184,166,0)} 100% {box-shadow:0 0 0 0 rgba(20,184,166,0)} }
@media (prefers-reduced-motion: reduce) { *,*:before,*:after { animation:none!important; transition:none!important; } }
@media(max-width:700px) { .hero {padding:24px 21px;border-radius:19px;} .block-container {padding-left:1rem;padding-right:1rem;} }

/* High-contrast theme overrides: readable in both Streamlit light and dark themes */
.stApp, [data-testid="stAppViewContainer"], [data-testid="stMain"] {
  color: #1b2942 !important;
}
[data-testid="stMarkdownContainer"],
[data-testid="stMarkdownContainer"] p,
[data-testid="stMarkdownContainer"] li,
[data-testid="stMarkdownContainer"] span,
[data-testid="stMarkdownContainer"] strong,
[data-testid="stWidgetLabel"] p,
[data-testid="stWidgetLabel"] label,
.stText, .stCaption, label {
  color: #263650 !important;
}
[data-testid="stMarkdownContainer"] h1,
[data-testid="stMarkdownContainer"] h2,
[data-testid="stMarkdownContainer"] h3,
[data-testid="stMarkdownContainer"] h4,
[data-testid="stMarkdownContainer"] h5,
[data-testid="stMarkdownContainer"] h6 {
  color: #142542 !important;
  font-family: 'Manrope', sans-serif !important;
  font-weight: 800 !important;
}
.section-heading {
  color: #142542 !important;
  font-size: 21px !important;
  font-weight: 800 !important;
}
.section-sub {
  color: #586982 !important;
  font-weight: 500 !important;
}
.hero, .hero h1, .hero p, .hero .hero-kicker, .hero .hero-pill {
  color: #ffffff !important;
}
.hero p { color: rgba(255,255,255,.9) !important; }
.hero .hero-kicker { color: #dce8ff !important; }
.hero .hero-pill { color: #ffffff !important; }
.status-line, .status-line b { color: #34445e !important; }
.metric-num { color: #18345d !important; }
.metric-caption { color: #52647f !important; }
.step-dot { color: #234db7 !important; }
div[data-testid="stFileUploader"] label,
div[data-testid="stFileUploader"] label p,
div[data-testid="stFileUploader"] section,
div[data-testid="stFileUploader"] section *,
div[data-testid="stFileUploader"] small {
  color: #263650 !important;
}
div[data-testid="stFileUploader"] section {
  background: #f4f7fd !important;
  border-color: #a9bbd7 !important;
}
div[data-testid="stTextInput"] label,
div[data-testid="stNumberInput"] label,
div[data-testid="stCheckbox"] label,
div[data-testid="stCheckbox"] label p {
  color: #263650 !important;
  font-weight: 700 !important;
}
div[data-testid="stTextInput"] input,
div[data-testid="stNumberInput"] input,
div[data-testid="stSelectbox"] div,
div[data-testid="stMultiSelect"] div {
  color: #172943 !important;
  background: #ffffff !important;
}
div[data-testid="stTextInput"] input::placeholder,
div[data-testid="stNumberInput"] input::placeholder {
  color: #77869c !important;
}
div[data-testid="stDataFrame"] {
  background: #ffffff !important;
}
div[data-testid="stExpander"] {
  background: #ffffff !important;
}
div[data-testid="stExpander"] summary,
div[data-testid="stExpander"] summary *,
div[data-testid="stExpander"] p {
  color: #263650 !important;
}
div[data-testid="stAlert"] p,
div[data-testid="stAlert"] span {
  color: #263650 !important;
}
.stCaption, [data-testid="stCaptionContainer"] p {
  color: #63738b !important;
}
.stButton > button, .stButton > button * {
  color: #ffffff !important;
}
.stButton > button:focus {
  outline: 3px solid rgba(49,95,229,.25) !important;
  outline-offset: 2px !important;
}
.footer-note { color: #718096 !important; }


/* Final visibility fixes for the hero title and uploaded-file chips */
.stApp .hero h1,
.stApp .hero h1 *,
.stApp [data-testid="stMarkdownContainer"] .hero h1 {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  opacity: 1 !important;
  text-shadow: 0 1px 1px rgba(8, 25, 55, .12);
}
.stApp .hero .hero-kicker,
.stApp .hero .hero-kicker *,
.stApp .hero p,
.stApp .hero p *,
.stApp .hero .hero-pill,
.stApp .hero .hero-pill * {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

/* Streamlit uploaded file item: replace default dark chip with a light card */
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"],
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] > div,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] > div > div,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] > div > div > div,
div[data-testid="stFileUploader"] .uploadedFile,
div[data-testid="stFileUploader"] div[class*="uploadedFile"] {
  background: #eaf1ff !important;
  color: #1d355d !important;
  border: 1px solid #c6d7f5 !important;
  border-radius: 10px !important;
  box-shadow: none !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] *,
div[data-testid="stFileUploader"] .uploadedFile *,
div[data-testid="stFileUploader"] div[class*="uploadedFile"] * {
  color: #1d355d !important;
  -webkit-text-fill-color: #1d355d !important;
  opacity: 1 !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] button,
div[data-testid="stFileUploader"] .uploadedFile button,
div[data-testid="stFileUploader"] div[class*="uploadedFile"] button {
  background: #d8e5ff !important;
  color: #244779 !important;
  border: 1px solid #b8ccef !important;
  border-radius: 8px !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] button svg,
div[data-testid="stFileUploader"] .uploadedFile button svg {
  fill: #244779 !important;
  color: #244779 !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] small,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] p {
  color: #536987 !important;
  -webkit-text-fill-color: #536987 !important;
}

/* Keep upload drop zone and its instructions consistently readable */
div[data-testid="stFileUploader"] section,
div[data-testid="stFileUploader"] section *,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderDropzone"],
div[data-testid="stFileUploader"] [data-testid="stFileUploaderDropzone"] * {
  color: #263c5b !important;
  -webkit-text-fill-color: #263c5b !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderDropzone"] {
  background: #f5f8ff !important;
  border: 1px dashed #9eb7e3 !important;
}


/* Clean light workspace: consistent typography, surfaces and contrast */
:root {
  color-scheme: light !important;
  --ink: #172b4d;
  --muted: #526581;
  --line: #dce5f1;
  --surface: #ffffff;
  --surface-soft: #f6f8fc;
}
html, body, [class*="css"] {
  font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif !important;
}
.stApp,
[data-testid="stAppViewContainer"],
[data-testid="stMain"],
[data-testid="stMainBlockContainer"] {
  background: #f4f7fb !important;
  color: #1b2d49 !important;
}
[data-testid="stMarkdownContainer"] p,
[data-testid="stMarkdownContainer"] li,
[data-testid="stMarkdownContainer"] span,
[data-testid="stWidgetLabel"] p,
[data-testid="stWidgetLabel"] label,
.stCaption,
[data-testid="stCaptionContainer"] p {
  color: #40536f !important;
}
[data-testid="stMarkdownContainer"] h1,
[data-testid="stMarkdownContainer"] h2,
[data-testid="stMarkdownContainer"] h3,
[data-testid="stMarkdownContainer"] h4,
.section-heading {
  color: #172b4d !important;
  font-family: 'Manrope', 'Segoe UI', Arial, sans-serif !important;
  font-weight: 800 !important;
  letter-spacing: -0.35px;
}
.section-heading { font-size: 21px !important; margin-top: 27px !important; }
.section-sub { color: #60718a !important; font-size: 13px !important; line-height: 1.6 !important; }

/* Hero is the only strong colour surface */
.hero {
  background: linear-gradient(115deg, #18345f 0%, #285a9d 62%, #287f89 100%) !important;
  border-radius: 22px !important;
}
.hero h1, .hero h1 *,
.hero p, .hero p *,
.hero .hero-kicker, .hero .hero-pill {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  opacity: 1 !important;
}
.hero h1 { font-size: clamp(28px, 3vw, 38px) !important; line-height: 1.2 !important; }
.hero p { color: #edf4ff !important; line-height: 1.65 !important; }
.hero .hero-kicker { color: #d7e5fb !important; }

/* Upload panels and drop zones */
div[data-testid="stFileUploader"] {
  color: #243b5b !important;
}
div[data-testid="stFileUploader"] label,
div[data-testid="stFileUploader"] label *,
div[data-testid="stFileUploader"] section,
div[data-testid="stFileUploader"] section * {
  color: #263d5d !important;
  -webkit-text-fill-color: #263d5d !important;
  opacity: 1 !important;
}
div[data-testid="stFileUploader"] section,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderDropzone"] {
  background: #f8faff !important;
  border: 1.5px dashed #a9bddc !important;
  border-radius: 13px !important;
}
div[data-testid="stFileUploader"] section button,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderDropzone"] button {
  background: #e8efff !important;
  border: 1px solid #c5d5f1 !important;
  color: #244c86 !important;
  border-radius: 9px !important;
}
div[data-testid="stFileUploader"] section button *,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderDropzone"] button * {
  color: #244c86 !important;
  fill: #244c86 !important;
}

/* Uploaded file row: target Streamlit versions with nested file-item markup */
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"],
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] > div,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] > div > div,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] > div > div > div,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] [data-testid],
div[data-testid="stFileUploader"] .uploadedFile,
div[data-testid="stFileUploader"] div[class*="uploadedFile"] {
  background: #eaf1fb !important;
  border: 1px solid #d1deef !important;
  border-radius: 10px !important;
  box-shadow: none !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] *,
div[data-testid="stFileUploader"] .uploadedFile *,
div[data-testid="stFileUploader"] div[class*="uploadedFile"] * {
  color: #203b60 !important;
  -webkit-text-fill-color: #203b60 !important;
  opacity: 1 !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] small,
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] p {
  color: #607694 !important;
  -webkit-text-fill-color: #607694 !important;
}
div[data-testid="stFileUploader"] [data-testid="stFileUploaderFile"] button,
div[data-testid="stFileUploader"] .uploadedFile button {
  background: #dbe7f8 !important;
  color: #31547e !important;
  border: 1px solid #c3d3e9 !important;
  border-radius: 8px !important;
}

/* Mapping table: white/light surface and clear table typography */
div[data-testid="stDataFrame"],
div[data-testid="stDataFrame"] > div {
  background: #ffffff !important;
  border: 1px solid #dce5f1 !important;
  border-radius: 13px !important;
  overflow: hidden !important;
}
div[data-testid="stDataFrame"] canvas {
  color-scheme: light !important;
}
div[data-testid="stDataFrame"] [role="grid"] {
  background: #ffffff !important;
}

/* Cards and metrics */
.metric-card,
div[data-testid="stVerticalBlockBorderWrapper"] > div {
  background: #ffffff !important;
  border-color: #dce5f1 !important;
}
.metric-num { color: #1b3b68 !important; font-weight: 800 !important; }
.metric-caption { color: #526783 !important; font-weight: 800 !important; }
.panel-title { color: #172b4d !important; }
.panel-copy, .panel-label { color: #5b6d86 !important; }

/* Text fields */
div[data-testid="stTextInput"] input,
div[data-testid="stNumberInput"] input {
  background: #ffffff !important;
  color: #1d3454 !important;
  border: 1px solid #cbd8e8 !important;
  border-radius: 10px !important;
}
div[data-testid="stTextInput"] input::placeholder,
div[data-testid="stNumberInput"] input::placeholder {
  color: #7a8ba3 !important;
}
div[data-testid="stTextInput"] label,
div[data-testid="stNumberInput"] label,
div[data-testid="stCheckbox"] label,
div[data-testid="stCheckbox"] label * {
  color: #263b59 !important;
  font-weight: 600 !important;
}

/* Checkbox: calm blue instead of bright red */
div[data-testid="stCheckbox"] input {
  accent-color: #3568c8 !important;
}
div[data-testid="stCheckbox"] label > div:first-child {
  border-color: #9db1cc !important;
}

/* Buttons */
.stButton > button {
  background: linear-gradient(105deg, #315fba, #287b91) !important;
  color: #ffffff !important;
  border: 0 !important;
  border-radius: 11px !important;
  font-weight: 700 !important;
  min-height: 44px !important;
  box-shadow: 0 5px 13px rgba(38, 83, 151, .14) !important;
}
.stButton > button *,
.stButton > button p {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}
.stButton > button:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

/* Alerts, toast notifications and expanders */
div[data-testid="stAlert"] {
  background: #eef5ff !important;
  border: 1px solid #cbdcf4 !important;
  border-radius: 12px !important;
}
div[data-testid="stAlert"] *,
div[data-testid="stExpander"] *,
div[data-testid="stToast"] *,
div[role="alert"] * {
  color: #263e60 !important;
  -webkit-text-fill-color: #263e60 !important;
  opacity: 1 !important;
}
div[data-testid="stToast"],
div[data-testid="stToast"] > div,
div[role="alert"] {
  background: #ffffff !important;
  border: 1px solid #dce5f1 !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(28, 49, 79, .13) !important;
}
div[data-testid="stExpander"] {
  background: #ffffff !important;
  border: 1px solid #dce5f1 !important;
  border-radius: 12px !important;
}
div[data-testid="stExpander"] summary,
div[data-testid="stExpander"] summary * {
  color: #263b59 !important;
}
.footer-note { color: #74839a !important; }


/* Compatibility + force a light palette even when the user's Streamlit theme is dark */
:root,
html,
body,
[data-testid="stAppViewContainer"],
[data-testid="stApp"] {
  color-scheme: light !important;
  --background-color: #f4f7fb !important;
  --secondary-background-color: #eaf1fb !important;
  --text-color: #203653 !important;
  --primary-color: #3568c8 !important;
}
[data-testid="stAppViewContainer"] * {
  scrollbar-color: #bdcce0 #f3f6fb;
}

/* Streamlit uploaded file chips across older and newer Streamlit DOM versions */
div[data-testid="stFileUploader"] [data-testid*="File"],
div[data-testid="stFileUploader"] [data-testid*="file"],
div[data-testid="stFileUploader"] [class*="uploaded"],
div[data-testid="stFileUploader"] [class*="Uploaded"],
div[data-testid="stFileUploader"] [class*="fileList"] > div,
div[data-testid="stFileUploader"] [class*="FileList"] > div {
  background: #e8f0fb !important;
  background-color: #e8f0fb !important;
  color: #1c385d !important;
  border: 1px solid #c8d8ed !important;
  border-radius: 10px !important;
  box-shadow: none !important;
}
div[data-testid="stFileUploader"] [data-testid*="File"] *,
div[data-testid="stFileUploader"] [data-testid*="file"] *,
div[data-testid="stFileUploader"] [class*="uploaded"] *,
div[data-testid="stFileUploader"] [class*="Uploaded"] *,
div[data-testid="stFileUploader"] [class*="fileList"] > div *,
div[data-testid="stFileUploader"] [class*="FileList"] > div * {
  color: #1c385d !important;
  -webkit-text-fill-color: #1c385d !important;
  opacity: 1 !important;
}
div[data-testid="stFileUploader"] [data-testid*="File"] small,
div[data-testid="stFileUploader"] [data-testid*="file"] small,
div[data-testid="stFileUploader"] [class*="uploaded"] small {
  color: #617895 !important;
  -webkit-text-fill-color: #617895 !important;
}
div[data-testid="stFileUploader"] [data-testid*="File"] button,
div[data-testid="stFileUploader"] [data-testid*="file"] button,
div[data-testid="stFileUploader"] [class*="uploaded"] button {
  background: #d7e5f7 !important;
  color: #244b7d !important;
  border: 1px solid #bed0e8 !important;
}
div[data-testid="stFileUploader"] [data-testid*="File"] button svg,
div[data-testid="stFileUploader"] [data-testid*="file"] button svg {
  color: #244b7d !important;
  fill: #244b7d !important;
}

/* Fallback for file-item containers identified by their file icon */
div[data-testid="stFileUploader"] div:has(svg[viewBox]) {
  color: #203653;
}

/* Accessible static mapping table; avoids Arrow/Glide dark canvas rendering */
div[data-testid="stTable"] {
  background: #ffffff !important;
  border: 1px solid #dce5f1 !important;
  border-radius: 13px !important;
  overflow-x: auto !important;
  padding: 0 !important;
}
div[data-testid="stTable"] table {
  width: 100% !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  background: #ffffff !important;
  color: #203653 !important;
  font-family: 'DM Sans', 'Segoe UI', Arial, sans-serif !important;
  font-size: 13px !important;
}
div[data-testid="stTable"] thead tr th {
  background: #eaf1fb !important;
  color: #1d385d !important;
  font-weight: 800 !important;
  text-align: left !important;
  padding: 12px 13px !important;
  border-bottom: 1px solid #d3dfef !important;
  white-space: nowrap !important;
}
div[data-testid="stTable"] tbody tr td {
  background: #ffffff !important;
  color: #263d5b !important;
  padding: 10px 13px !important;
  border-bottom: 1px solid #edf1f6 !important;
  font-weight: 500 !important;
  line-height: 1.5 !important;
  vertical-align: middle !important;
}
div[data-testid="stTable"] tbody tr:nth-child(even) td {
  background: #f8faff !important;
}
div[data-testid="stTable"] tbody tr:hover td {
  background: #eef4fc !important;
}

/* Toast and notification readability */
div[data-testid="stToast"],
div[data-testid="stToast"] > div,
div[data-testid="stToast"] *,
div[role="alert"],
div[role="alert"] * {
  background-color: #ffffff !important;
  color: #243b59 !important;
  -webkit-text-fill-color: #243b59 !important;
  opacity: 1 !important;
}
div[data-testid="stToast"] {
  border: 1px solid #dce5f1 !important;
  box-shadow: 0 8px 24px rgba(28,49,79,.14) !important;
  border-radius: 12px !important;
}

/* Checkbox uses the same calm blue as the rest of the interface */
div[data-testid="stCheckbox"] input {
  accent-color: #3568c8 !important;
}

</style>
""", unsafe_allow_html=True)

st.markdown("""
<div class="hero">
  <div class="hero-kicker">DFIT • Data operations workspace</div>
  <h1>Excel to Production JSON</h1>
  <p>A safer, clearer workflow to match workbooks, validate every mapping, preview changes and update your production data without disturbing the existing structure.</p>
  <div class="hero-pills">
    <span class="hero-pill">✦ Four data pipelines</span>
    <span class="hero-pill">✓ Validation before writing</span>
    <span class="hero-pill">↺ Automatic backups</span>
    <span class="hero-pill">⌁ Change-aware updates</span>
  </div>
</div>
""", unsafe_allow_html=True)

st.markdown("""
<div class="status-line"><span class="pulse"></span><b>Workspace ready</b><span>•</span><span>Build 2026.11.16</span><span>•</span><span>Existing JSON structure is preserved</span></div>
""", unsafe_allow_html=True)

st.markdown('<div class="section-heading">01 · Configure your workspace</div><div class="section-sub">Choose the extracted production folder and the year you want to update.</div>', unsafe_allow_html=True)
config_col, year_col = st.columns([3, 1])
with config_col:
    root_text=st.text_input(
        "Production project folder",
        value=str(Path.cwd() / "DFIT_New"),
        help="Enter the permanent path to your extracted DFIT_New folder. You do not need to upload the production ZIP again."
    )
with year_col:
    year=st.number_input("Target year",min_value=2000,max_value=2100,value=2026,step=1)
root=Path(root_text).expanduser()
if root.is_dir():
    st.success(f"Production folder found · {root}")
else:
    st.warning("Production folder not found yet. Check the path before validating.")

st.markdown('<div class="section-heading">02 · Add your Excel workbooks</div><div class="section-sub">Upload all four source workbooks. Each workbook is matched against its approved production JSON filenames.</div>', unsafe_allow_html=True)
col1,col2=st.columns(2)
with col1:
    with st.container(border=True):
        st.markdown('<span class="step-dot">01</span> **Leprosy**', unsafe_allow_html=True)
        leprosy=st.file_uploader("Leprosy Excel",type=["xlsx","xlsm"],key="upload_leprosy")
    with st.container(border=True):
        st.markdown('<span class="step-dot">02</span> **TB Annexure M**', unsafe_allow_html=True)
        annexure=st.file_uploader("TB Annexure M Excel",type=["xlsx","xlsm"],key="upload_annexure")
with col2:
    with st.container(border=True):
        st.markdown('<span class="step-dot">03</span> **TB Case Finding**', unsafe_allow_html=True)
        case_finding=st.file_uploader("TB Case Finding Excel",type=["xlsx","xlsm"],key="upload_case_finding")
    with st.container(border=True):
        st.markdown('<span class="step-dot">04</span> **TB Outcomes**', unsafe_allow_html=True)
        outcomes=st.file_uploader("TB Outcomes Excel",type=["xlsx","xlsm"],key="upload_outcomes")

uploads={"leprosy":leprosy,"annexure":annexure,"case_finding":case_finding,"outcomes":outcomes}
uploaded_count=sum(v is not None for v in uploads.values())
m1,m2,m3=st.columns(3)
for col, number, label in [
    (m1, f"{uploaded_count}/4", "Workbooks uploaded"),
    (m2, str(year), "Target year"),
    (m3, "3-step", "Validate · preview · write"),
]:
    with col:
        st.markdown(f'<div class="metric-card"><div class="metric-num">{number}</div><div class="metric-caption">{label}</div></div>',unsafe_allow_html=True)

backup=st.checkbox("Create timestamped backups of existing JSON files before writing",value=True,help="Backups are saved inside the production folder under BACKUPS.")

st.markdown('<div class="section-heading">03 · Validate and preview</div><div class="section-sub">Nothing is written during validation. Review the mapping table before confirming the update.</div>', unsafe_allow_html=True)
if st.button("✦  MATCH, VALIDATE & PREVIEW",type="primary",use_container_width=True):
    if not root.is_dir():
        st.error("The production folder path does not exist. Enter the path to your extracted DFIT_New folder.")
    elif any(v is None for v in uploads.values()):
        missing=[p["label"] for p in PIPELINES if uploads[p["excel_key"]] is None]
        st.error("Upload all four Excel workbooks before validation.")
        st.caption("Still missing: " + " · ".join(missing))
    else:
        allplans={}; errors=[]
        progress=st.progress(0,text="Starting validation…")
        with st.spinner("Matching worksheets, checking schemas and preparing a safe preview…"):
            for idx,pipeline in enumerate(PIPELINES):
                try:
                    source,dest,plans=process_pipeline(root,pipeline,uploads[pipeline["excel_key"]].getvalue(),int(year))
                    allplans[pipeline["key"]]=(source,dest,plans)
                except Exception as e:
                    errors.append(f'{pipeline["label"]}: {e}')
                progress.progress((idx+1)/len(PIPELINES),text=f'Validated {pipeline["label"]} · {idx+1} of {len(PIPELINES)}')
        progress.empty()
        if errors:
            st.error("Validation failed. No files were changed.")
            for e in errors: st.write("• "+e)
            st.session_state.pop("dfit_plans",None)
        else:
            st.session_state["dfit_root"]=str(root.resolve())
            st.session_state["dfit_plans"]={k:(str(src),str(dst),[{**x,"target":str(x["target"])} for x in plans]) for k,(src,dst,plans) in allplans.items()}
            st.session_state["dfit_backup"]=backup
            st.session_state["dfit_target_year"]=int(year)
            st.success("All worksheets matched the approved production filenames and passed structural validation.")
            st.toast("Preview is ready. No production files have been changed.",icon="✅")

if "dfit_plans" in st.session_state:
    st.markdown('<div class="section-heading">04 · Review the update plan</div><div class="section-sub">Check every worksheet-to-file match and its planned action. Unchanged files are skipped automatically.</div>', unsafe_allow_html=True)
    rows=[]
    for pipeline in PIPELINES:
        source,dest,plans=st.session_state["dfit_plans"][pipeline["key"]]
        st.markdown(f'**{pipeline["label"]}**  ·  `{Path(dest).relative_to(Path(st.session_state["dfit_root"]))}`')
        for x in plans:
            matched=target_matches_data(Path(x["target"]), x["data"])
            rows.append({"Pipeline":pipeline["label"],"Excel worksheet":x["worksheet"],
                         "Existing production filename":x["source_name"],
                         "Target JSON":str(Path(x["target"]).relative_to(Path(st.session_state["dfit_root"]))),
                         "Action":("✓ Matched · no write needed" if matched
                                   else "↻ Update existing file" if x["target_exists"]
                                   else "+ Create year copy"),
                         "JSON records":x["records"],"Unmatched S.NO":", ".join(map(str,x["missing"])) or "-"})
    changed_count=sum(not target_matches_data(Path(x["target"]),x["data"]) for _,_,plans in st.session_state["dfit_plans"].values() for x in plans)
    total_files=len(rows)
    a,b,c=st.columns(3)
    for col,num,label in [(a,str(total_files),"Files in preview"),(b,str(changed_count),"Files requiring changes"),(c,str(total_files-changed_count),"Already matched")]:
        with col:
            st.markdown(f'<div class="metric-card"><div class="metric-num">{num}</div><div class="metric-caption">{label}</div></div>',unsafe_allow_html=True)
    st.table(rows)
    with st.expander("What the updater protects",expanded=False):
        st.markdown("""
        - Existing JSON array/object structure, record order, keys, filenames, capitalization and spelling are retained.
        - Blank cells, numeric/text `0`, a single hyphen (`-`) and Excel errors preserve the existing JSON value.
        - Percentage/rate fields use the workbook's percentage formatting and displayed precision.
        - Existing target-year JSON is used as the fallback baseline when present.
        - Files whose resulting data is identical are not rewritten.
        - A validation error stops the operation before any production file is changed.
        """)
    st.info("The preview is based on the uploaded workbooks and current target JSON files. If you change a workbook or target folder, run validation again before writing.")
    st.markdown('<div class="section-heading">05 · Confirm and write</div><div class="section-sub">The write step only updates files that differ from the validated preview.</div>', unsafe_allow_html=True)
    confirmed=st.checkbox("I reviewed the mapping and confirm that the updated JSON files should be written to the production folder.",key="dfit_confirm")
    if confirmed:
        if st.button("✓  WRITE UPDATED JSON FILES",type="primary",use_container_width=True):
            root=Path(st.session_state["dfit_root"])
            backup_root=root/"BACKUPS"/("json_update_"+datetime.now().strftime("%Y%m%d_%H%M%S"))
            changed=[]; backed=[]
            try:
                total_to_process=sum(len(plans) for _,_,plans in st.session_state["dfit_plans"].values())
                write_progress=st.progress(0,text="Preparing production update…")
                done=0
                with st.spinner("Writing changed JSON files and creating backups…"):
                    for pipeline in PIPELINES:
                        _,_,plans=st.session_state["dfit_plans"][pipeline["key"]]
                        for x in plans:
                            target=Path(x["target"])
                            target.parent.mkdir(parents=True,exist_ok=True)
                            if target.exists():
                                try:
                                    current_data=json.loads(target.read_text(encoding="utf-8-sig"))
                                except Exception:
                                    current_data=None
                                if current_data is not None and normalized_json(current_data) == normalized_json(x["data"]):
                                    done+=1
                                    write_progress.progress(done/max(total_to_process,1),text=f"Checked {done} of {total_to_process} files…")
                                    continue
                            if target.exists() and st.session_state["dfit_backup"]:
                                bp=backup_root/target.relative_to(root)
                                bp.parent.mkdir(parents=True,exist_ok=True)
                                shutil.copy2(target,bp); backed.append(str(bp.relative_to(root)))
                            write_json_preserving_style(target, x["data"])
                            changed.append(str(target.relative_to(root)))
                            done+=1
                            write_progress.progress(done/max(total_to_process,1),text=f"Processed {done} of {total_to_process} files…")
                write_progress.empty()
                st.success(f"Update complete · {len(changed)} JSON files changed · {len(backed)} backups created.")
                st.markdown(f'<div class="metric-card"><div class="metric-num">{len(changed)}</div><div class="metric-caption">JSON files successfully updated</div></div>',unsafe_allow_html=True)
                st.write(f"Production folder: `{root}`")
                with st.expander("View updated JSON files",expanded=bool(changed)):
                    if changed:
                        for f in changed: st.write("✓ "+f)
                    else:
                        st.write("Everything already matched. No files needed to be rewritten.")
                if backed:
                    with st.expander("View backup files"):
                        for f in backed: st.write("✓ "+f)
            except Exception as e:
                st.exception(e)
    else:
        st.caption("Writing is locked until you confirm the preview above.")

st.markdown('<div class="footer-note">DFIT Data Studio · Built for careful, traceable data updates · Core matching and JSON conversion logic retained</div>',unsafe_allow_html=True)
