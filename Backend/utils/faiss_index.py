# utils/faiss_index.py
import faiss
import numpy as np
import json
import os

INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "data/faiss_index.bin")
META_PATH = os.getenv("FAISS_META_PATH", "data/faiss_meta.json")

def build_faiss_index(embeddings):
    if embeddings is None or len(embeddings) == 0:
        raise ValueError("Embeddings vacíos")
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings.astype(np.float32))
    return index

def save_index(index, meta, index_path=INDEX_PATH, meta_path=META_PATH):
    os.makedirs(os.path.dirname(index_path) or ".", exist_ok=True)
    faiss.write_index(index, index_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

def load_index(index_path=INDEX_PATH, meta_path=META_PATH):
    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        return None, {}
    index = faiss.read_index(index_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return index, meta
