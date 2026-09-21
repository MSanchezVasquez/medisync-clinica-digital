import os
from typing import Any

import requests
import streamlit as st


BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000").rstrip("/")
TECNICAS = {
    "Zero-Shot": "zero-shot",
    "One-Shot": "one-shot",
    "Few-Shot": "few-shot",
}


def evaluar_sintomas(sintomas: str, tecnica: str) -> dict[str, Any]:
    respuesta = requests.post(
        f"{BACKEND_URL}/api/triaje",
        json={"sintomas": sintomas, "tecnica": tecnica},
        timeout=40,
    )
    try:
        datos = respuesta.json()
    except ValueError as error:
        raise RuntimeError("El backend devolvio una respuesta no valida.") from error
    if not respuesta.ok:
        raise RuntimeError(datos.get("error", "No fue posible completar la evaluacion."))
    return datos


st.set_page_config(page_title="MediSync IA", page_icon=None, layout="centered")
st.title("Laboratorio de triaje con IA")
st.write(
    "Compare tecnicas de prompting sobre un mismo caso clinico. "
    "Esta interfaz es demostrativa y no reemplaza la evaluacion de un profesional de salud."
)

if "historial" not in st.session_state:
    st.session_state.historial = []

with st.form("evaluacion"):
    tecnica_visible = st.selectbox("Tecnica de prompting", list(TECNICAS))
    sintomas = st.text_area(
        "Sintomas",
        placeholder="Describa sintomas, duracion y signos relevantes.",
        height=150,
        max_chars=3000,
    )
    enviado = st.form_submit_button("Procesar evaluacion", use_container_width=True)

if enviado:
    if not sintomas.strip():
        st.warning("Ingrese una descripcion de sintomas.")
    else:
        try:
            with st.spinner("Analizando la informacion..."):
                resultado = evaluar_sintomas(sintomas.strip(), TECNICAS[tecnica_visible])
            st.session_state.historial.insert(
                0,
                {
                    "tecnica": tecnica_visible,
                    "sintomas": sintomas.strip(),
                    "resultado": resultado,
                },
            )
        except requests.ConnectionError:
            st.error("No se pudo conectar con el backend. Verifique que el servicio este activo.")
        except requests.Timeout:
            st.error("La solicitud excedio el tiempo de espera. Intente nuevamente.")
        except RuntimeError as error:
            st.error(str(error))

if st.session_state.historial:
    actual = st.session_state.historial[0]["resultado"]
    st.subheader("Resultado")
    columna_1, columna_2 = st.columns(2)
    columna_1.metric("Urgencia", actual["urgencia"])
    columna_2.metric("Tecnica", actual.get("tecnica", "No informada"))
    st.write(f"**Especialidad sugerida:** {actual['especialidad']}")
    st.write(f"**Recomendacion:** {actual['recomendacion']}")

    with st.expander("Historial de esta sesion"):
        for indice, item in enumerate(st.session_state.historial, start=1):
            resultado = item["resultado"]
            st.markdown(f"**{indice}. {item['tecnica']} - {resultado['urgencia']}**")
            st.caption(item["sintomas"])
            st.write(resultado["recomendacion"])

with st.expander("Acerca de las tecnicas"):
    st.markdown(
        """
        - **Zero-Shot:** solicita la tarea sin ejemplos previos.
        - **One-Shot:** incluye un ejemplo completo para orientar la respuesta.
        - **Few-Shot:** incluye varios ejemplos de distintas urgencias.
        """
    )
