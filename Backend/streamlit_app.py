# streamlit_app.py
import streamlit as st
import requests
import os

API_URL = os.getenv("LOCAL_API", "http://127.0.0.1:8000")

st.title("Prototipo OSDR RAG — prueba local")

st.markdown("1) Si no has creado el índice, llama a **Reconstruir índice** (usa la API local `/rebuild_index`).")

if st.button("Reconstruir índice (API + CSV)"):
    r = requests.post(f"{API_URL}/rebuild_index", json={"limit": 200, "include_api": True, "include_csv": True})
    st.write(r.json())

q = st.text_input("Tu consulta (ej: 'biología molecular', 'microbioma', 'radiación celular')")

top_k = st.slider("Top K", 1, 20, 5)

if st.button("Buscar y resumir"):
    if not q.strip():
        st.warning("Escribe una consulta.")
    else:
        payload = {"query": q, "top_k": top_k}
        r = requests.post(f"{API_URL}/query", json=payload, timeout=120)
        data = r.json()
        st.subheader("Resumen (LLM)")
        st.write(data.get("summary",""))
        st.subheader("Resultados relevantes")
        for res in data.get("results", []):
            md = res["meta"]
            st.markdown(f"**{res.get('id')}** — {md.get('title_pre') or md.get('title') or md.get('raw',{}).get('Study Title','')}")
            if md.get('origin') == 'osdr':
                st.write("Origen: OSDR")
            else:
                st.write("Origen: CSV")
            st.write(res.get("text_preview","")[:800])
            st.markdown("---")
