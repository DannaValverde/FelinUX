import faiss
import numpy as np

def build_faiss_index(embeddings):
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

def save_index(index, path="data/faiss_index.bin"):
    faiss.write_index(index, path)

def load_index(path="data/faiss_index.bin"):
    return faiss.read_index(path)
