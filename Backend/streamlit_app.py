import streamlit as st
import requests
import json
import os
from datetime import datetime

# URL del backend FastAPI
API_URL = os.getenv("LOCAL_API", "http://127.0.0.1:8000")

# Estilos CSS personalizados mejorados
st.markdown("""
    <style>
    .main {
        background-color: #111827;
        color: white;
    }
    .title {
        text-align: center;
        font-size: 2.5em;
        font-weight: 800;
        margin-top: 1em;
        background: linear-gradient(45deg, #3B82F6, #10B981);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .subtitle {
        text-align: center;
        font-size: 1.1em;
        color: #9ca3af;
        margin-bottom: 1.5em;
    }
    .search-box {
        display: flex;
        justify-content: center;
        margin-bottom: 2em;
    }
    .stTextInput>div>div>input {
        font-size: 1.1em;
        padding: 0.8em;
        border-radius: 10px;
        border: 2px solid #374151;
        background-color: #1f2937;
        color: white;
    }
    .result-card {
        background: linear-gradient(135deg, #1f2937, #374151);
        padding: 1.5em;
        border-radius: 15px;
        margin-bottom: 1em;
        border-left: 4px solid #3B82F6;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .filter-section {
        background-color: #1f2937;
        padding: 1em;
        border-radius: 10px;
        margin-bottom: 1em;
    }
    </style>
""", unsafe_allow_html=True)

# -------------------------------
# Configuración de la página
# -------------------------------
st.set_page_config(
    page_title="NASA Space Biology Knowledge Engine",
    page_icon="🚀",
    layout="wide"
)

# -------------------------------
# Cabecera visual
# -------------------------------
st.markdown("<div class='title'>🚀 Motor de Conocimiento de Biología Espacial NASA</div>", unsafe_allow_html=True)
st.markdown("<div class='subtitle'>Búsqueda semántica avanzada en papers de investigación - Powered by RAG & AI</div>", unsafe_allow_html=True)

# -------------------------------
# Sidebar - Filtros y controles
# -------------------------------
with st.sidebar:
    st.header("⚙️ Filtros Avanzados")
    
    # Obtener estadísticas para los filtros
    try:
        stats_response = requests.get(f"{API_URL}/stats", timeout=10)
        if stats_response.status_code == 200:
            stats = stats_response.json()
        else:
            stats = {"programs": [], "years": []}
    except:
        stats = {"programs": [], "years": []}
    
    # Filtro por programa
    program_filter = st.selectbox(
        "Programa",
        [""] + sorted(stats.get("programs", [])),
        help="Filtrar por programa de investigación"
    )
    
    # Filtro por año
    year_filter = st.selectbox(
        "Año",
        [""] + sorted(stats.get("years", []), reverse=True),
        help="Filtrar por año de publicación"
    )
    
    # Filtros adicionales
    st.subheader("Opciones de Búsqueda")
    top_k = st.slider("Número de resultados", 3, 20, 8)
    
    # Información del sistema
    st.markdown("---")
    st.subheader("📊 Estadísticas")
    if stats:
        st.metric("Total de Papers", stats.get("total_papers", 0))
    
    # Reconstrucción del índice
    st.markdown("---")
    st.subheader("🔄 Gestión del Índice")
    
    if st.button("Reconstruir Índice", use_container_width=True):
        with st.spinner("Reconstruyendo índice con todos los papers..."):
            try:
                response = requests.post(
                    f"{API_URL}/rebuild_index", 
                    json={"limit": 0, "include_csv": True},
                    timeout=120
                )
                if response.status_code == 200:
                    st.success("Índice reconstruido correctamente ✅")
                    st.rerun()
                else:
                    st.error(f"Error: {response.status_code}")
            except Exception as e:
                st.error(f"Error conectando con el servidor: {e}")

# -------------------------------
# Búsqueda principal
# -------------------------------
col1, col2 = st.columns([3, 1])
with col1:
    query_text = st.text_input(
        " ",
        placeholder="Ejemplo: 'Efectos de la microgravedad en el crecimiento de plantas' o 'Metabolismo óseo en misiones espaciales largas'",
        label_visibility="collapsed"
    )
with col2:
    search_button = st.button("🔍 Buscar", use_container_width=True)

# -------------------------------
# Procesamiento de búsqueda
# -------------------------------
if search_button and query_text.strip():
    with st.spinner("🔍 Buscando en la base de conocimiento..."):
        # Construir payload con filtros
        filters = {}
        if program_filter:
            filters["program"] = program_filter
        if year_filter:
            filters["year"] = year_filter
        
        payload = {
            "query": query_text.strip(),
            "top_k": top_k,
            "filters": filters
        }

        try:
            response = requests.post(f"{API_URL}/query", json=payload, timeout=60)
            if response.status_code == 200:
                result = response.json()
                
                # Mostrar resumen generado por IA
                if result.get("summary"):
                    st.markdown("---")
                    st.subheader("🧠 Resumen Inteligente")
                    with st.container():
                        st.info(result["summary"])
                    
                    st.metric("Papers encontrados", result.get("total_found", 0))
                    st.markdown("---")
                
                # Mostrar resultados detallados
                papers = result.get("papers", [])
                if papers:
                    st.subheader(f"📄 Papers Relevantes ({len(papers)})")
                    
                    for i, paper in enumerate(papers, 1):
                        meta = paper.get("meta", {})
                        score = paper.get("score", 0)
                        
                        with st.container():
                            st.markdown(f"<div class='result-card'>", unsafe_allow_html=True)
                            
                            # Header con título y score
                            col_a, col_b = st.columns([4, 1])
                            with col_a:
                                st.markdown(f"**{i}. {meta.get('title', 'Sin título')}**")
                            with col_b:
                                st.markdown(f"`Sim: {score:.3f}`")
                            
                            # Metadatos
                            col1, col2, col3 = st.columns(3)
                            with col1:
                                if meta.get('program'):
                                    st.markdown(f"**Programa:** `{meta.get('program')}`")
                            with col2:
                                if meta.get('year'):
                                    st.markdown(f"**Año:** `{meta.get('year')}`")
                            with col3:
                                if meta.get('authors'):
                                    authors = meta.get('authors', '')[:50] + "..." if len(meta.get('authors', '')) > 50 else meta.get('authors', '')
                                    st.markdown(f"**Autores:** `{authors}`")
                            
                            # Abstract/Preview
                            preview = paper.get('text_preview', '') or meta.get('abstract', '')
                            if preview:
                                with st.expander("Ver resumen"):
                                    st.write(preview)
                            
                            # Enlace si está disponible
                            if meta.get('link'):
                                st.markdown(f"[🔗 Ver paper completo]({meta.get('link')})")
                            
                            st.markdown("</div>", unsafe_allow_html=True)
                else:
                    st.warning("No se encontraron papers relevantes para tu búsqueda. Intenta con otros términos o ajusta los filtros.")
                    
            else:
                st.error(f"Error en el servidor: {response.status_code}")
                
        except Exception as e:
            st.error(f"Error conectando con el servidor: {e}")

elif search_button and not query_text.strip():
    st.warning("Por favor, ingresa una consulta para buscar.")

# -------------------------------
# Estado del sistema
# -------------------------------
with st.sidebar:
    st.markdown("---")
    st.subheader("ℹ️ Estado del Sistema")
    
    try:
        # Verificar conexión con el backend
        health_response = requests.get(f"{API_URL}/", timeout=5)
        if health_response.status_code == 200:
            st.success("✅ Backend conectado")
        else:
            st.error("❌ Backend no disponible")
    except:
        st.error("❌ No se puede conectar al backend")

# -------------------------------
# Información cuando no hay búsqueda
# -------------------------------
if not search_button or not query_text.strip():
    st.markdown("---")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.subheader("🎯 Búsqueda Semántica")
        st.markdown("""
        - Encuentra papers por **conceptos** no solo palabras clave
        - Búsqueda natural en lenguaje humano
        - Resultados ranked por relevancia semántica
        """)
    
    with col2:
        st.subheader("🔍 Filtros Avanzados")
        st.markdown("""
        - Filtra por **programa** de investigación
        - Filtra por **año** de publicación
        - Combina múltiples criterios
        """)
    
    with col3:
        st.subheader("🧠 Resumen IA")
        st.markdown("""
        - Resúmenes contextuales generados por LLM
        - Síntesis de múltiples fuentes
        - Respuestas coherentes y concisas
        """)
    
    # Ejemplos de búsquedas
    st.markdown("---")
    st.subheader("💡 Ejemplos de búsquedas:")
    
    examples = [
        "Efectos de la radiación espacial en el ADN",
        "Cultivo de plantas en microgravedad",
        "Cambios metabólicos en astronautas",
        "Sistemas de soporte vital regenerativo",
        "Neuroplasticidad en entornos espaciales"
    ]
    
    for example in examples:
        if st.button(example, key=example):
            st.session_state.last_example = example
            st.rerun()

# Inicializar session state para ejemplos
if 'last_example' not in st.session_state:
    st.session_state.last_example = ""