import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from pydantic import BaseModel
from models.embedding_model import embed_texts
from models.llm_model import generate_summary
from utils.osdr_utils import search_studies_osdr, get_study_meta, get_study_files
from utils.faiss_index import build_faiss_index

import numpy as np
import faiss

app = FastAPI(title="NASA OSDR RAG API")

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/query")
def query_osdr(request: QueryRequest):
    # 1️⃣ Buscar estudios OSDR
    studies = search_studies_osdr(request.query, size=20)
    if not studies:
        return {"summary": "No se encontraron estudios.", "papers": []}

    # 2️⃣ Embeddings + FAISS
    titles = [s['title_pre'] for s in studies]
    embeddings = embed_texts(titles)
    index = build_faiss_index(embeddings)

    query_vec = embed_texts([request.query])
    distances, indices = index.search(query_vec, request.top_k)

    # 3️⃣ Preparar contexto para LLM
    context_text = ""
    papers = []
    for idx in indices[0]:
        s = studies[idx]
        osd_num = s["osd_numeric_id"]
        meta = get_study_meta(osd_num) or {}
        files = get_study_files(osd_num)

        files_text = ""
        for f in files:
            size_str = f" | {f['size']} bytes" if f['size'] else ""
            cat_str = f" [{f['category']}]" if f['category'] else ""
            files_text += f"- {f['name']}{cat_str}{size_str}\n  {f['download_url']}\n"

        context_text += f"Estudio: {s['title_pre']}\n"
        context_text += f"Programa: {s['program']}\n"
        context_text += f"Fechas: {s['mission_start']} - {s['mission_end']}\n"
        if files_text:
            context_text += f"Archivos:\n{files_text}"
        context_text += "\n---\n"

        papers.append({
            "title": s['title_pre'],
            "program": s['program'],
            "mission_start": s['mission_start'],
            "mission_end": s['mission_end'],
            "files": files
        })

    summary = generate_summary(context_text)
    return {"summary": summary, "papers": papers}
