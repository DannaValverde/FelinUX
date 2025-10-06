# models/llm_model.py
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import os
from textwrap import shorten

LLM_NAME = os.getenv("LLM_MODEL", "google/flan-t5-small")
tokenizer_llm = AutoTokenizer.from_pretrained(LLM_NAME)
model_llm = AutoModelForSeq2SeqLM.from_pretrained(LLM_NAME, torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model_llm.to(device)

def _generate(prompt, max_length=256, min_length=30):
    inputs = tokenizer_llm(prompt, return_tensors="pt", truncation=True, max_length=1024).to(device)
    outputs = model_llm.generate(**inputs, max_length=max_length, min_length=min_length, do_sample=False)
    return tokenizer_llm.decode(outputs[0], skip_special_tokens=True)

def generate_summary(text, max_length=300):
    """
    Si text es muy largo, lo divide en chunks y resume cada chunk y luego concatena.
    """
    if not text:
        return ""
    # simple chunking por caracteres (mejor usar por oraciones si quieres)
    CHUNK_SIZE = 3000
    chunks = [text[i:i+CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE)]
    partials = []
    for c in chunks:
        prompt = (
            "Resumir de manera clara y concisa. Incluir títulos, programa espacial, fechas y archivos si están presentes.\n\n"
            f"{c}\n\nResumen:"
        )
        s = _generate(prompt, max_length=256)
        partials.append(s.strip())
    if len(partials) == 1:
        return partials[0]
    # combinar y pedir un resumen final
    combined = "\n\n".join(partials)
    final_prompt = "Combinar y sintetizar los siguientes resúmenes en un solo resumen corto y claro (3-6 oraciones):\n\n" + combined + "\nResumen final:"
    final = _generate(final_prompt, max_length=max_length)
    return final.strip()
