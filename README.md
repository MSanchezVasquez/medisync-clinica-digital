# MediSync Perú - Plataforma de Pre-Triaje Clínico

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)

MediSync Perú es una aplicación web para registrar pacientes, evaluar síntomas mediante Google Gemini y administrar un historial de pre-triajes. El monorepositorio utiliza una única interfaz React conectada a un backend Express.

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
- Selector integrado en `/triaje` para comparar Zero-Shot, One-Shot y Few-Shot.

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
- `GET /api/estado-base-datos`
- `GET /api/dashboard`
- `GET /api/triajes`
- `POST /api/triajes`
- `PUT /api/triajes/:id`
- `DELETE /api/triajes/:id`
- `GET /api/ia/prompts`

La persistencia usa PostgreSQL de Supabase mediante su API REST desde Express; Prisma versiona el esquema y las migraciones. Si `SUPABASE_URL` y `SUPABASE_SECRET_KEY` no están configuradas, el backend conserva un modo local de desarrollo en `backend/data/triajes.json`. No cambia automáticamente al modo local cuando Supabase presenta un error de conexión.

El endpoint `GET /api/estado-base-datos` permite comprobar qué proveedor está activo y si responde.

## Requisitos

- Node.js 24 o superior.
- pnpm 11.
- Una API key válida de Google Gemini creada en Google AI Studio.
- Un proyecto de Supabase con una base PostgreSQL.

## Configuración

Crea `backend/.env` con el siguiente contenido:

```env
GEMINI_API_KEY=TU_API_KEY
GEMINI_MODEL=gemini-3.8-flash
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=TU_SECRET_KEY
DIRECT_URL=postgresql://postgres:CONTRASENA@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
```

El archivo `.env` está excluido de Git y no debe subirse al repositorio.

En Supabase, copia los valores desde **Project Settings**:

- `SUPABASE_URL`: URL del proyecto.
- `SUPABASE_SECRET_KEY`: clave `sb_secret_...` usada solo por Express. Nunca debe llevar el prefijo `VITE_` ni aparecer en el frontend. Los proyectos antiguos también pueden usar `SUPABASE_SERVICE_ROLE_KEY`.
- `DIRECT_URL`: conexión directa para Prisma Migrate. Si tu red no admite IPv6, utiliza el Session Pooler para esta variable.

Aplica la migración inicial:

```bash
cd backend
pnpm install
pnpm run db:deploy
```

Como alternativa, pega `backend/prisma/migrations/20260921000000_create_triajes/migration.sql` en el SQL Editor de Supabase. Esto crea la tabla `triajes`, validaciones, índices, actualización automática de fechas y RLS sin acceso para clientes públicos. Las credenciales quedan únicamente en el backend; el frontend nunca se conecta directamente a Supabase.

Si ya existen datos locales y tienes autorización para enviarlos a Supabase, impórtalos una sola vez:

```bash
pnpm run db:import-json
```

La importación no se ejecuta automáticamente porque el archivo puede contener datos personales.

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

El repositorio incluye imágenes separadas para frontend y backend, coordinadas mediante Docker Compose:

- `backend/Dockerfile`: compila TypeScript y ejecuta la API con Node.js.
- `frontend/Dockerfile`: compila React y sirve la SPA mediante Nginx.
- `docker-compose.yml`: expone frontend en `5173` y backend en `3000`.

Antes de levantar los servicios, configura `backend/.env` con Gemini y las conexiones de Supabase. Aplica las migraciones una vez y después ejecuta desde la raíz:

```bash
docker compose run --rm backend pnpm run db:deploy
docker compose up --build
```

Para detener los contenedores:

```bash
docker compose down
```

El directorio `backend/data` se monta únicamente para conservar el modo local cuando Supabase no está configurado.

La comparación de técnicas está incorporada directamente en `http://localhost:5173/triaje`. La explicación técnica del avance está en `docs/AVANCE_2_IA.md` y la biblioteca completa en `docs/PROMPT_LIBRARY.md`.

## Verificación

```bash
cd backend
pnpm run check
pnpm test

cd ../frontend
pnpm run build
```

El workflow de GitHub Actions instala dependencias con lockfile congelado, ejecuta las pruebas y compila backend y frontend. La configuración `frontend/pnpm-workspace.yaml` autoriza únicamente el script de instalación requerido por `core-js`.

## Consideraciones

- El pre-triaje es orientativo y no sustituye una evaluación médica profesional.
- Los nombres obtenidos por DNI provienen de una fuente pública externa y deben verificarse.
- No se deben versionar archivos `.env`, dependencias, compilaciones ni datos reales de pacientes.
- Para datos clínicos reales se deben definir autenticación, autorización, auditoría, copias de seguridad y políticas de retención antes de publicar el sistema.
