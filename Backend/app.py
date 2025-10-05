import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from pydantic import BaseModel
from models.embedding_model import embed_texts
from models.llm_model import generate_summary
from utils.faiss_index import build_faiss_index

app = FastAPI(title="NASA OSDR RAG API")

BASE_URL = "https://visualization.osdr.nasa.gov/biodata/api/v2/datasets/"

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5

# ----------------------------
# Funciones utilitarias
# ----------------------------
def get_all_datasets(limit=10):
    try:
        resp = requests.get(BASE_URL, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # Limitar a los primeros `limit` datasets
        return dict(list(data.items())[:limit])
    except requests.RequestException:
        return {}

def get_dataset_metadata(dataset_id, rest_url):
    if not rest_url:
        return {}
    try:
        resp = requests.get(rest_url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get(dataset_id, {}).get("metadata", {})
    except requests.RequestException:
        return {}

def get_dataset_csv_files(dataset_id, files_info):
    if not files_info:
        return []

    files_url = files_info.get("REST_URL")
    if not files_url:
        return []

    try:
        resp = requests.get(files_url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        files = data.get(dataset_id, {}).get("files", {})
        csv_list = []
        for fname, f in files.items():
            if fname.endswith(".csv") and isinstance(f, dict):
                csv_url = f.get("URL")
                if csv_url:
                    csv_list.append({"name": fname, "url": csv_url})
        return csv_list
    except requests.RequestException:
        return []

# ----------------------------
# Endpoint principal con embeddings + LLM
# ----------------------------
@app.post("/query")
def query_osdr(request: QueryRequest):
    # 1️⃣ Obtener datasets
    datasets = get_all_datasets(limit=10)
    if not datasets:
        return {"summary": "No se encontraron estudios.", "papers": []}

    studies = []
    for dataset_id, dataset_info in datasets.items():
        metadata = get_dataset_metadata(dataset_id, dataset_info.get("REST_URL"))
        title = metadata.get("study title") or metadata.get("study description") or ""
        description = metadata.get("study description", "")

        # Convertir a string si son listas
        if isinstance(title, list):
            title = " ".join(title)
        if isinstance(description, list):
            description = " ".join(description)

        studies.append({
            "osd_numeric_id": dataset_id,
            "title_pre": title,
            "description": description,
            "files": get_dataset_csv_files(dataset_id, dataset_info.get("files"))
        })

    if not studies:
        return {"summary": "No se encontraron estudios relevantes.", "papers": []}

    # 2️⃣ Embeddings + FAISS
    titles = [s['title_pre'] for s in studies]
    embeddings = embed_texts(titles)
    index = build_faiss_index(embeddings)

    query_vec = embed_texts([request.query])
    distances, indices = index.search(query_vec, min(request.top_k, len(studies)))

    # 3️⃣ Preparar contexto para LLM
    context_text = ""
    papers = []
    for idx in indices[0]:
        s = studies[idx]
        files_text = ""
        for f in s.get("files", []):
            files_text += f"- {f['name']}\n  {f['url']}\n"

        context_text += f"Estudio: {s['title_pre']}\n"
        context_text += f"Descripción: {s.get('description','')}\n"
        if files_text:
            context_text += f"Archivos CSV:\n{files_text}"
        context_text += "\n---\n"

        papers.append({
            "title": s['title_pre'],
            "description": s.get("description",""),
            "files": s.get("files", [])
        })

    summary = generate_summary(context_text)
    return {"summary": summary, "papers": papers}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
