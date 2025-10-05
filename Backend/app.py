# app.py
import os
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # 👈
import traceback
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import numpy as np
import pandas as pd

from models.embedding_model import embed_texts
from models.llm_model import generate_summary
from utils.faiss_index import build_faiss_index, save_index, load_index

INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "data/faiss_index.bin")
META_PATH = os.getenv("FAISS_META_PATH", "data/faiss_meta.json")
CSV_PAPERS_PATH = os.getenv("CSV_PAPERS_PATH", "data/papers.csv")

app = FastAPI(title="NASA OSDR RAG API")
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,    # en prod, pon tu dominio real
    allow_credentials=True,
    allow_methods=["*"],              # GET, POST, OPTIONS, etc.
    allow_headers=["*"],              # Content-Type, Authorization, etc.
)


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None  # Ej: {"program":"Apollo", "year":["2020","2021"]}

class RebuildRequest(BaseModel):
    limit: int = 1000
    include_csv: bool = True

# cargar índice en memoria al inicio (si existe)
index, meta = load_index()

# -------------------------
# Utilidades internas
# -------------------------
def safe_lower(x):
    return str(x).lower() if x is not None else ""

def safe_str(x):
    return str(x) if x is not None else ""

def match_filter(meta_item: dict, filters: dict) -> bool:
    """
    Match flexible: substring match case-insensitive.
    - Si filters vacíos -> true (no filtra).
    """
    if not filters:
        return True
    
    for k, v in filters.items():
        if v is None or (isinstance(v, str) and v.strip() == ""):
            continue
            
        val_meta = safe_lower(meta_item.get(k, ""))
        
        # Para campos de fecha/año
        if k in ['year', 'date']:
            meta_year = safe_str(meta_item.get(k, ""))
            if isinstance(v, (list, tuple)):
                if not any(str(x) in meta_year for x in v):
                    return False
            else:
                if str(v) not in meta_year:
                    return False
            continue
            
        # Para otros campos (program, authors, etc.)
        if isinstance(v, (list, tuple)):
            if not any(safe_lower(str(x)) in val_meta for x in v):
                return False
        else:
            if safe_lower(str(v)) not in val_meta:
                return False
                
    return True

def ensure_index_loaded():
    global index, meta
    if index is None or not meta:
        index, meta = load_index()
    return index, meta

def extract_year_from_date(date_str):
    """Extrae el año de una fecha en formato string"""
    if not date_str:
        return ""
    date_str = str(date_str)
    # Buscar patrones de año (4 dígitos)
    import re
    year_match = re.search(r'\b(19|20)\d{2}\b', date_str)
    return year_match.group() if year_match else ""

# -------------------------
# Endpoints
# -------------------------
@app.post("/rebuild_index")
def rebuild_index(req: RebuildRequest):
    """
    Reconstruye índice FAISS a partir del CSV de papers.
    """
    try:
        items = []
        
        # Cargar CSV de papers
        if req.include_csv and os.path.exists(CSV_PAPERS_PATH):
            try:
                df = pd.read_csv(CSV_PAPERS_PATH)
                print(f"CSV cargado con {len(df)} filas")
                
                # Limitar si es necesario
                if req.limit > 0:
                    df = df.head(req.limit)
                
                for i, row in df.iterrows():
                    # Extraer campos principales con valores por defecto
                    title = safe_str(row.get("title", row.get("Title", "")))
                    abstract = safe_str(row.get("abstract", row.get("Abstract", row.get("summary", ""))))
                    authors = safe_str(row.get("authors", row.get("Authors", "")))
                    program = safe_str(row.get("program", row.get("Program", "Desconocido")))
                    date = safe_str(row.get("date", row.get("Date", "")))
                    year = extract_year_from_date(date)
                    link = safe_str(row.get("link", row.get("Link", "")))
                    journal = safe_str(row.get("journal", row.get("Journal", "")))
                    
                    # Texto para embeddings (combinación de título y abstract)
                    text = f"{title}\n\n{abstract}".strip()
                    
                    # Metadata completa
                    meta_item = {
                        "origin": "csv",
                        "id": f"csv-{i}",
                        "title": title,
                        "authors": authors,
                        "program": program,
                        "date": date,
                        "year": year,
                        "link": link,
                        "journal": journal,
                        "abstract": abstract[:500] if abstract else "",  # preview del abstract
                        "raw": row.to_dict()
                    }
                    
                    items.append({
                        "id": f"csv-{i}", 
                        "text": text, 
                        "meta": meta_item
                    })
                    
                print(f"Se procesaron {len(items)} items para indexar")
                
            except Exception as e:
                print(f"Error procesando CSV: {e}")
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Error procesando CSV: {e}")

        if not items:
            raise HTTPException(status_code=400, detail="No se encontraron items para indexar.")

        # Generar embeddings y construir índice
        texts = [it["text"] or it["meta"]["title"] for it in items]
        print(f"Generando embeddings para {len(texts)} textos...")
        embeddings = embed_texts(texts)
        
        print("Construyendo índice FAISS...")
        faiss_index = build_faiss_index(embeddings)
        
        # Guardar metadata
        meta_dict = {
            "items": [
                {
                    "id": it["id"], 
                    "meta": it["meta"], 
                    "text_preview": it["text"][:400] if it["text"] else it["meta"]["title"]
                } for it in items
            ]
        }
        
        save_index(faiss_index, meta_dict)
        # recargar en memoria
        ensure_index_loaded()
        
        return {
            "status": "ok", 
            "indexed": len(items),
            "message": f"Índice reconstruido con {len(items)} papers del CSV"
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error reconstruyendo índice: {e}")

@app.get("/papers")
def list_papers(limit: int = 200, program: Optional[str] = None, year: Optional[str] = None):
    """
    Lista todos los papers con filtros opcionales
    """
    index, meta = ensure_index_loaded()
    if not meta:
        return {"papers": []}
    
    papers = meta.get("items", [])
    
    # Aplicar filtros
    if program:
        papers = [p for p in papers if program.lower() in safe_lower(p["meta"].get("program", ""))]
    
    if year:
        papers = [p for p in papers if year in safe_str(p["meta"].get("year", ""))]
    
    return {"papers": papers[:limit], "total": len(papers)}

@app.get("/paper/{paper_id}")
def get_paper(paper_id: str):
    """
    Obtiene un paper específico por ID
    """
    index, meta = ensure_index_loaded()
    for it in meta.get("items", []):
        if it["id"] == paper_id:
            return it
    raise HTTPException(status_code=404, detail="Paper no encontrado")

@app.get("/stats")
def get_stats():
    """
    Estadísticas de los papers indexados
    """
    index, meta = ensure_index_loaded()
    if not meta:
        return {"total_papers": 0, "programs": [], "years": []}
    
    papers = meta.get("items", [])
    programs = list(set(p["meta"].get("program", "Desconocido") for p in papers))
    years = list(set(p["meta"].get("year", "") for p in papers if p["meta"].get("year")))
    
    return {
        "total_papers": len(papers),
        "programs": programs,
        "years": [y for y in years if y]  # filtrar años vacíos
    }

@app.post("/query")
def query_papers(request: QueryRequest):
    """
    Búsqueda semántica + RAG con filtros avanzados
    """
    try:
        index, meta = ensure_index_loaded()
        if index is None or not meta:
            raise HTTPException(status_code=400, detail="Índice no encontrado. Llama a /rebuild_index primero.")

        filters = request.filters or {}
        
        # Embed consulta
        q_emb = embed_texts([request.query])
        
        # Buscar más resultados de los pedidos para tener margen al filtrar
        search_k = min(max(request.top_k * 10, 10), max(1, index.ntotal))
        D, I = index.search(q_emb, search_k)
        D = D[0]  # distances
        I = I[0]  # indices

        # Recoger resultados aplicando filtros
        items_all = meta.get("items", [])
        selected = []
        
        for pos, idx in enumerate(I):
            if idx < 0 or idx >= len(items_all):
                continue
                
            item = items_all[idx]
            meta_item = item.get("meta", {})
            
            if match_filter(meta_item, filters):
                selected.append({
                    "id": item.get("id"), 
                    "meta": meta_item, 
                    "text_preview": item.get("text_preview", "")[:1000], 
                    "score": float(D[pos])
                })
                
            if len(selected) >= request.top_k:
                break

        # Fallback: si no hay resultados después de filtrar, devolver los más relevantes globalmente
        if not selected:
            for pos, idx in enumerate(I[:request.top_k]):
                if idx < 0 or idx >= len(items_all):
                    continue
                item = items_all[idx]
                meta_item = item.get("meta", {})
                selected.append({
                    "id": item.get("id"), 
                    "meta": meta_item, 
                    "text_preview": item.get("text_preview", "")[:1000], 
                    "score": float(D[pos])
                })

        # Construir contexto para el resumen LLM
        context_parts = []
        for s in selected[:8]:  # Limitar a 8 para no saturar el contexto
            title = s["meta"].get("title", "")
            abstract_preview = s["meta"].get("abstract", s["text_preview"])
            context_parts.append(f"Título: {title}\nResumen: {abstract_preview}")
        
        context_text = "\n\n".join(context_parts)
        
        # Prompt mejorado para el resumen
        prompt_for_summary = f"""
        Basado en los siguientes documentos de investigación sobre biología espacial, proporciona un resumen conciso que responda a la consulta del usuario.

        Consulta: {request.query}

        Documentos relevantes:
        {context_text}

        Por favor, proporciona un resumen coherente de 3-5 oraciones que sintetice la información más relevante de estos documentos en relación con la consulta.
        """

        summary = generate_summary(prompt_for_summary, max_length=400)

        return {
            "summary": summary, 
            "papers": selected,
            "total_found": len(selected)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        return {
            "summary": f"Error en la búsqueda: {str(e)}", 
            "papers": [], 
            "total_found": 0
        }

@app.get("/")
def root():
    return {"message": "NASA Papers RAG API - Motor de búsqueda semántica para papers de biología espacial"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)