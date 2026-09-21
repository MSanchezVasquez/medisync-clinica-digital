# MediSync Perú - Plataforma de Pre-Triaje Clínico

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

MediSync Perú es una aplicación web para registrar pacientes, evaluar síntomas mediante Google Gemini y administrar un historial de pre-triajes. El monorepositorio incluye frontend React, backend Express y un laboratorio Streamlit para comparar técnicas de prompting.

## Funcionalidades

- Consulta de nombres y apellidos a partir del DNI mediante un proxy del backend.
- Obtención dinámica del token y las cookies requeridas por el servicio externo de DNI.
- Registro de edad, peso, altura y síntomas del paciente.
- Evaluación de síntomas mediante Google Gemini.
- Niveles de urgencia `ALTA`, `MEDIA`, `BAJA` y `NULA`.
- Las evaluaciones con urgencia `NULA` no se guardan ni afectan las métricas.
- Guardado automático de los triajes clínicamente relevantes.
- Dashboard con pacientes atendidos durante el día, urgencias altas y estado real de Gemini.
- Historial de triajes con opciones para editar, reevaluar, eliminar y descargar informes PDF.
- Al editar un registro se vuelve a consultar el DNI y se genera un diagnóstico nuevo.
- Navegación entre Inicio y Triaje, diseño adaptable y modo oscuro.
- Interfaz basada en iconos SVG, sin emojis en el código.
- Biblioteca versionada de prompts Zero-Shot, One-Shot y Few-Shot.
- Interfaz Streamlit para demostrar y comparar las tres técnicas.

## Arquitectura

### Frontend

Aplicación SPA desarrollada con React, TypeScript, Vite y Tailwind CSS v4. Incluye React Router, Sonner, GSAP y jsPDF.

Rutas principales:

- `/login`: acceso administrativo de demostración.
- `/dashboard`: métricas e historial de triajes.
- `/triaje`: consulta del paciente y evaluación clínica.

### Backend

API REST desarrollada con Node.js, Express y TypeScript. Gestiona la integración con Gemini, la consulta externa de DNI, las métricas y la persistencia del historial.

Endpoints principales:

- `POST /api/consultar-dni`
- `POST /api/triaje`
- `GET /api/estado-ia`
- `GET /api/dashboard`
- `GET /api/triajes`
- `POST /api/triajes`
- `PUT /api/triajes/:id`
- `DELETE /api/triajes/:id`
- `GET /api/ia/prompts`

Los triajes se almacenan localmente en `backend/data/triajes.json`. Este mecanismo está pensado para desarrollo y demostración; un despliegue productivo debe utilizar una base de datos y controles de acceso adecuados para datos personales.

## Requisitos

- Node.js 24 o superior.
- pnpm 11.
- Una API key válida de Google Gemini creada en Google AI Studio.

## Configuración

Crea `backend/.env` con el siguiente contenido:

```env
GEMINI_API_KEY=TU_API_KEY
```

El archivo `.env` está excluido de Git y no debe subirse al repositorio.

## Ejecución local

Instala e inicia el backend:

```bash
cd backend
pnpm install
pnpm run dev
```

En otra terminal, instala e inicia el frontend:

```bash
cd frontend
pnpm install
pnpm run dev
```

Abre `http://localhost:5173` en el navegador. Para la cuenta de demostración utiliza `admin` y `1234`.

## Ejecución con Docker

El repositorio incluye imágenes separadas para frontend, backend y Streamlit, coordinadas mediante Docker Compose:

- `backend/Dockerfile`: compila TypeScript y ejecuta la API con Node.js.
- `frontend/Dockerfile`: compila React y sirve la SPA mediante Nginx.
- `streamlit/Dockerfile`: ejecuta el laboratorio de técnicas de prompting.
- `docker-compose.yml`: expone frontend en `5173`, backend en `3000` y Streamlit en `8501`.

Antes de levantar los servicios, configura `backend/.env` con `GEMINI_API_KEY`. Después ejecuta desde la raíz:

```bash
docker compose up --build
```

Para detener los contenedores:

```bash
docker compose down
```

El directorio `backend/data` se monta como volumen para conservar el historial local al recrear el contenedor.

## Laboratorio Streamlit

Con el backend activo, instala y ejecuta la interfaz demostrativa:

```bash
cd streamlit
python -m pip install -r requirements.txt
streamlit run app.py
```

Abre `http://localhost:8501`. La interfaz permite seleccionar Zero-Shot, One-Shot o Few-Shot y conserva un historial temporal de la sesión.

La explicación técnica del avance está en `docs/AVANCE_2_IA.md` y la biblioteca completa en `docs/PROMPT_LIBRARY.md`.

## Verificación

```bash
cd backend
pnpm run check
pnpm test

cd ../frontend
pnpm run build

cd ../streamlit
python -m compileall -q .
```

El workflow de GitHub Actions instala dependencias con lockfile congelado, ejecuta las pruebas, compila backend y frontend y verifica el módulo Streamlit. La configuración `frontend/pnpm-workspace.yaml` autoriza únicamente el script de instalación requerido por `core-js`.

## Consideraciones

- El pre-triaje es orientativo y no sustituye una evaluación médica profesional.
- Los nombres obtenidos por DNI provienen de una fuente pública externa y deben verificarse.
- No se deben versionar archivos `.env`, dependencias, compilaciones ni datos reales de pacientes.
