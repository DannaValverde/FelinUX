# streamlit_app.py
import streamlit as st
import requests
import os
import pandas as pd
import altair as alt

API_URL = os.getenv("LOCAL_API", "http://127.0.0.1:8000")

st.set_page_config(page_title="OSDR RAG Dashboard", layout="wide")

st.title("📊 Prototipo OSDR RAG — Dashboard")

tabs = st.tabs(["🔍 Buscar y Resumir", "📈 Estadísticas", "📄 Papers"])

# --- TAB: Buscar y Resumir ---
with tabs[0]:
    st.markdown("### Buscar en OSDR + CSV")
    q = st.text_input("Tu consulta (ej: 'biología molecular', 'microbioma', 'radiación celular')")
    top_k = st.slider("Top K", 1, 20, 5)

    if st.button("Buscar y resumir"):
        if not q.strip():
            st.warning("Escribe una consulta.")
        else:
            payload = {"query": q, "top_k": top_k}
            r = requests.post(f"{API_URL}/query", json=payload, timeout=120)
            data = r.json()

            st.subheader("📄 Resumen (LLM)")
            st.write(data.get("summary", ""))

            st.subheader("Resultados relevantes")
            for res in data.get("results", []):
                md = res.get("meta", {})
                title = md.get('title_pre') or md.get('title') or md.get('raw', {}).get('Study Title', '')
                st.markdown(f"**{res.get('id')}** — {title}")

                if md.get('origin') == 'osdr':
                    osdr_url = f"https://osdr.nasa.gov/study/{md.get('osd_numeric_id')}"
                    st.markdown(f"[🔗 Ver estudio OSDR]({osdr_url})", unsafe_allow_html=True)
                    st.write("Origen: OSDR")
                elif md.get('origin') == 'csv':
                    if md.get('link'):
                        st.markdown(f"[🔗 Ver paper CSV]({md.get('link')})", unsafe_allow_html=True)
                    st.write("Origen: CSV")

                st.write(res.get("text_preview", "")[:800])
                st.markdown("---")

# --- TAB: Estadísticas ---
with tabs[1]:
    st.header("📊 Estadísticas de Papers")
    resp = requests.get(f"{API_URL}/papers?limit=500")
    papers = resp.json().get("papers", [])
    if papers:
        df = pd.DataFrame([{
            "program": p["meta"].get("program", "Desconocido"),
            "origin": p["meta"].get("origin"),
        } for p in papers])
        chart = alt.Chart(df).mark_bar().encode(
            x=alt.X("program:N", title="Programa"),
            y=alt.Y("count()", title="Cantidad"),
            color="origin:N"
        ).properties(title="Cantidad de Papers por Programa y Origen")
        st.altair_chart(chart, use_container_width=True)

# --- TAB: Papers ---
with tabs[2]:
    st.header("📄 Lista de Papers")
    resp = requests.get(f"{API_URL}/papers?limit=200")
    papers = resp.json().get("papers", [])
    for p in papers:
        md = p.get("meta", {})
        st.markdown(f"**{p.get('id')}** — {md.get('title_pre') or md.get('title') or md.get('raw', {}).get('Study Title', '')}")
        if md.get('origin') == 'osdr':
            osdr_url = f"https://osdr.nasa.gov/study/{md.get('osd_numeric_id')}"
            st.markdown(f"[🔗 Ver estudio OSDR]({osdr_url})", unsafe_allow_html=True)
        elif md.get('origin') == 'csv':
            if md.get('link'):
                st.markdown(f"[🔗 Ver paper CSV]({md.get('link')})", unsafe_allow_html=True)
        st.markdown("---")
