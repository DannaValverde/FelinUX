from sentence_transformers import SentenceTransformer

embed_model_name = "sentence-transformers/all-MiniLM-L6-v2"
embed_model = SentenceTransformer(embed_model_name)

def embed_texts(texts):
    return embed_model.encode(texts, convert_to_numpy=True)
