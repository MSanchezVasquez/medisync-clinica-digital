# 🏥 MediSync Perú - Plataforma de Pre-Triaje Clínico & Telemetría UCI

Sistema integral de pre-triaje clínico asistido por Inteligencia Artificial (Gemini), telemetría IoT en tiempo real para camas UCI, automatización No-Code (Make/n8n) y gestión hospitalaria modular.

---

## 🌐 Enlaces en Producción

* **Frontend (Vercel):** [https://medisync-clinica-digital.vercel.app](https://medisync-clinica-digital.vercel.app)
* **Backend API (Render):** [https://medisync-peru.onrender.com](https://medisync-peru.onrender.com)

---

## 🚀 Guía de Instalación y Ejecución Local

Sigue estos pasos para clonar el repositorio y levantar el proyecto completo en tu ordenador.

### Prerrequisitos
Asegúrate de tener instalado en tu sistema:
* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada)
* [pnpm](https://pnpm.io/) (Puedes instalarlo ejecutando `npm install -g pnpm`)
* Una instancia de base de datos PostgreSQL (puedes usar [Supabase](https://supabase.com/)).

### 1. Clonar el repositorio
Abre tu terminal y ejecuta el siguiente comando:
```bash
git clone [https://github.com/mcodex23/medisync-peru.git](https://github.com/mcodex23/medisync-peru.git)
cd medisync-peru
```

### 2. Configurar las Variables de Entorno
Crea un archivo .env dentro de la carpeta backend/ basándote en la siguiente estructura:

```bash
PORT=3000
DATABASE_URL="tu_cadena_de_conexion_postgresql"
JWT_SECRET="tu_clave_secreta_jwt"
GEMINI_API_KEY="tu_api_key_de_google_gemini"
NOCODE_WEBHOOK_URL="tu_url_de_webhook_make_o_n8n"
```

### 3. Instalar dependencias
Instala todas las dependencias del monorepo utilizando pnpm:

```bash
pnpm install
```

### 4. Configurar la Base de Datos (Prisma)
Sincroniza el esquema de Prisma con tu base de datos PostgreSQL:

```bash
cd backend
pnpm prisma db push
cd ..
```

### 5. Ejecutar la Aplicación en Modo Desarrollo
Puedes iniciar los servicios de forma independiente:

Iniciar el Backend:

```bash
cd backend
pnpm dev
```

Iniciar el Frontend:

```bash
cd frontend
pnpm dev
```

Una vez iniciado, podrás acceder al frontend localmente (generalmente en http://localhost:5173 o el puerto que indique tu terminal de Vite) y conectarlo con tu API local en http://localhost:3000.

🛠️ Tecnologías Principales

| Frontend: React, TypeScript, Tailwind CSS, Vite.

| Backend: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (Supabase).

| Inteligencia Artificial: Google Gemini API (Evaluación de pre-triaje clínico).

| Automatización: Make / n8n (Webhooks de notificaciones en tiempo real).