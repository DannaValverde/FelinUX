# app.py
import os
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd

from models.embedding_model import embed_texts
from models.llm_model import generate_summary
from utils.faiss_index import build_faiss_index, save_index, load_index
from utils.osdr_utils import search_studies_osdr, get_study_files

INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "data/faiss_index.bin")
META_PATH = os.getenv("FAISS_META_PATH", "data/faiss_meta.json")
CSV_PAPERS_PATH = os.getenv("CSV_PAPERS_PATH", "data/papers.csv")

app = FastAPI(title="NASA OSDR RAG API")

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    filters: Optional[dict] = None

class RebuildRequest(BaseModel):
    limit: int = 608
    include_api: bool = True
    include_csv: bool = True

index, meta = load_index()

def load_papers_csv(path=CSV_PAPERS_PATH):
    if not os.path.exists(path):
        return []
    try:
        df = pd.read_csv(path)
        papers = []
        for i, row in df.iterrows():
            papers.append({
                "source": "csv",
                "id": f"csv-{i}",
                "title": str(row.get("title", "")),
                "link": str(row.get("link", "")),
                "raw": row.to_dict()
            })
        return papers
    except Exception as e:
        print("Error cargando CSV:", e)
        return []

def build_meta_from_studies(osdr_studies, csv_papers):
    items = []
    for s in osdr_studies:
        id_ = f"osdr-{s.get('osd_numeric_id')}"
        title = s.get("title_pre") or ""
        desc = (s.get("raw", {}).get("Study Summary") or "") or s.get("raw", {}).get("study_description", "") or ""
        text = title + "\n" + (desc if isinstance(desc, str) else " ")
        items.append({"id": id_, "text": text, "meta": {"origin": "osdr", **s, "related_csv": []}})

    # Relacionar CSV con OSDR
    for i, p in enumerate(csv_papers):
        related_osdr = []
        for s in osdr_studies:
            if title_similarity(s.get("title_pre", ""), p["title"]) > 0.6:
                related_osdr.append(f"osdr-{s.get('osd_numeric_id')}")
        items.append({
            "id": p["id"],
            "text": p["title"] + "\n" + (p.get("raw", {}).get("abstract", "") or ""),
            "meta": {"origin": "csv", **p, "related_osdr": related_osdr}
        })
    return items

def title_similarity(title1, title2):
    """Devuelve un valor de similitud básico entre títulos (0 a 1)."""
    set1, set2 = set(title1.lower().split()), set(title2.lower().split())
    if not set1 or not set2:
        return 0
    return len(set1 & set2) / len(set1 | set2)

@app.post("/rebuild_index")
def rebuild_index(req: RebuildRequest):
    osdr_studies = []
    if req.include_api:
        try:
            osdr_studies = search_studies_osdr("", size=req.limit) or []
        except Exception as e:
            print("osdr search error:", e)
    csv_papers = load_papers_csv() if req.include_csv else []
    items = build_meta_from_studies(osdr_studies, csv_papers)
    if not items:
        raise HTTPException(status_code=400, detail="No se encontraron items para indexar.")
    texts = [it["text"] for it in items]
    embeddings = embed_texts(texts)
    faiss_index = build_faiss_index(embeddings)
    meta_dict = {"items": [{"id": it["id"], "meta": it["meta"], "text_preview": it["text"][:400]} for it in items]}
    save_index(faiss_index, meta_dict)
    return {"status": "ok", "indexed": len(items)}

@app.get("/papers")
def list_papers(limit: int = 200):
    global index, meta
    index, meta = load_index()
    if not meta:
        return {"papers": []}
    return {"papers": meta.get("items", [])[:limit]}

@app.get("/paper/{paper_id}")
def get_paper(paper_id: str):
    _, meta = load_index()
    for it in meta.get("items", []):
        if it["id"] == paper_id:
            if it["meta"].get("origin") == "osdr":
                osd_id = it["meta"].get("osd_numeric_id")
                try:
                    files = get_study_files(osd_id)
                except:
                    files = []
                it["meta"]["files"] = files
            return it
    raise HTTPException(status_code=404, detail="Paper no encontrado")

@app.post("/query")
def query_osdr(request: QueryRequest):
    global index, meta
    index, meta = load_index()
    if index is None or not meta:
        raise HTTPException(status_code=400, detail="Índice no encontrado. Llama a /rebuild_index primero.")
    
    q_emb = embed_texts([request.query])
    top_k = min(request.top_k, index.ntotal)
    D, I = index.search(q_emb, top_k)
    items = meta.get("items", [])
    results = []
    context_text = ""

    for idx in I[0]:
        item = items[idx]
        meta_item = item.get("meta", {})
        preview = item.get("text") or meta_item.get("title_pre") or meta_item.get("title") or meta_item.get("raw", {}).get("Study Title", "")
        results.append({
            "id": item.get("id", ""),
            "meta": meta_item,
            "text_preview": preview[:1000]
        })
        context_text += (
            f"Título: {meta_item.get('title_pre') or meta_item.get('title') or ''}\n"
            f"Origen: {meta_item.get('origin')}\n"
            f"{preview[:1500]}\n---\n"
        )

    summary = generate_summary(f"Consulta: {request.query}\n\nContexto:\n{context_text}")
    return {"summary": summary, "results": results}
