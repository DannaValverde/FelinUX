from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tokenizer_llm = AutoTokenizer.from_pretrained("google/flan-t5-small")
model_llm = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-small")

def generate_summary(text, max_length=300):
    prompt = (
        "Resumir los estudios encontrados de forma clara y concisa.\n"
        "Incluir títulos, programa espacial, fechas y archivos.\n"
        f"{text}\nResumen:"
    )
    inputs = tokenizer_llm.encode(prompt, return_tensors="pt", max_length=1024, truncation=True)
    outputs = model_llm.generate(inputs, max_length=max_length, min_length=50, do_sample=False)
    return tokenizer_llm.decode(outputs[0], skip_special_tokens=True)
