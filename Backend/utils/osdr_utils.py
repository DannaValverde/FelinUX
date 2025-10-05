# utils/osdr_utils.py
import re, requests
from urllib.parse import quote
import os

BASE = os.getenv("OSDR_BASE", "https://osdr.nasa.gov")
SEARCH_URL = f"{BASE}/osdr/data/search"
META_URL = f"{BASE}/osdr/data/osd/meta"
FILES_URL = f"{BASE}/osdr/data/osd/files"
HEADERS = {"Accept": "application/json", "User-Agent": "OSDR-Helper/1.0"}
TIMEOUT = 30

def extract_osd_numeric(value):
    if value is None:
        return None
    s = str(value).strip()
    if s.isdigit():
        return s
    m = re.search(r"OSD-(\d+)(?:\.\d+)?", s, flags=re.IGNORECASE)
    return m.group(1) if m else None

def build_download_url(remote_url: str) -> str:
    if not remote_url:
        return ""
    if remote_url.startswith("http://") or remote_url.startswith("https://"):
        return remote_url
    if not remote_url.startswith("/"):
        remote_url = "/" + remote_url
    return f"{BASE}{remote_url}"

def safe_get(d, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k, default)
    return cur

def search_studies_osdr(query, size=20):
    url = f"{SEARCH_URL}?term={quote(query)}&from=0&size={size}"
    resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    if resp.status_code != 200:
        return []
    hits = resp.json().get("hits", {}).get("hits", [])
    results = []
    for h in hits:
        src = h.get("_source", {}) or {}
        candidates = [
            src.get("OSD Study Id"),
            src.get("OSD Study ID"),
            src.get("Study Identifier"),
            src.get("Study Accession"),
        ]
        osd_num = osd_label = None
        for cand in candidates:
            num = extract_osd_numeric(cand)
            if num:
                osd_num = num
                osd_label = f"OSD-{num}"
                break
        if not osd_num:
            continue
        title_pre = (src.get("Study Protocol Name") or src.get("Study Title") or "No Title").strip()
        mission = src.get("Mission", {}) or {}
        results.append({
            "osd_numeric_id": osd_num,
            "osd_label": osd_label,
            "title_pre": title_pre,
            "program": src.get("Flight Program") or src.get("Program") or "Unknown",
            "mission_start": mission.get("Start Date") or "Unknown",
            "mission_end": mission.get("End Date") or "Unknown",
            "raw": src
        })
    return results

def get_study_meta(osd_numeric_id):
    url = f"{META_URL}/{quote(str(osd_numeric_id))}"
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    if r.status_code != 200:
        return None
    try:
        return r.json()
    except:
        return None

def get_study_files(osd_numeric_id):
    url = f"{FILES_URL}/{quote(str(osd_numeric_id))}"
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    if r.status_code != 200:
        return []
    try:
        data = r.json()
    except:
        return []
    key = f"OSD-{osd_numeric_id}"
    files_list = safe_get(data, "studies", key, "study_files", default=[])
    if not isinstance(files_list, list):
        return []
    processed = []
    for f in files_list[:10]:
        remote = f.get("remote_url") or f.get("remote") or ""
        processed.append({
            "name": f.get("name") or f.get("file_name") or "",
            "category": f.get("category") or "",
            "size": f.get("size") or f.get("file_size") or "",
            "download_url": build_download_url(remote)
        })
    return processed
