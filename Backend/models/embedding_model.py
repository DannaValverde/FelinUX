# models/embedding_model.py
from sentence_transformers import SentenceTransformer
import numpy as np
import os

embed_model_name = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
embed_model = SentenceTransformer(embed_model_name)

def embed_texts(texts, batch_size=64):
    """
    texts: list[str]
    Devuelve un np.array de shape (n_texts, dim)
    """
    if not texts:
        return np.zeros((0, embed_model.get_sentence_embedding_dimension()), dtype=np.float32)
    embeddings = embed_model.encode(texts, batch_size=batch_size, show_progress_bar=False, convert_to_numpy=True)
    return embeddings
