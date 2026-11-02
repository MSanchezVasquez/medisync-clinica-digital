# MediSync Perú - Sistema de Triaje & Telemetría UCI 🚀

> **Plataforma médica de grado clínico** para la automatización de triajes hospitalarios, procesamiento asistido por Inteligencia Artificial, monitoreo IoT de constante vital biométrica y bots RPA de extracción masiva de reportes.

---

## 🛠️ Tecnologías y Arquitectura

### **Frontend & UI**
* **React 18** con **TypeScript** y **Vite**
* **Tailwind CSS** + **Framer Motion** (Micro-interacciones y UI en modo oscuro/claro)
* **Sonner** (Notificaciones flotantes en tiempo real)

### **Backend & Servicios**
* **Node.js** + **Express.js** + **TypeScript**
* **Supabase** (PostgreSQL Relacional en la Nube con ACID Compliance)
* **Docker** & **Docker Compose** (Contenedorización multi-servicio)

### **Automatización, IoT & IA**
* **RPA Bot:** Playwright (Extracción autónoma e interacción con interfaz web)
* **IoT Emulator:** Node.js Edge Script (`DISP-UCI-04` emitiendo HR, Temp, SpO2 cada 5s)
* **No-Code / Low-Code:** Make.com (Canal automatizado de triaje por correo electrónico)
* **Laboratorio IA:** Streamlit + Python (Auditoría de respuestas del modelo)

---

## Estructura del Monorepositorio

```bash
medisync-peru/
├── backend/          # REST API con Express, TypeScript y conexión Supabase
├── frontend/         # Dashboard en React, Tailwind CSS, Notificaciones y Perfil
├── rpa-bot/          # Bot RPA autónomo con Playwright (bot_reporte.ts)
├── iot-device/       # Emulador de telemetría IoT biométrica (iot-simulador.js)
├── streamlit/        # Módulo de laboratorio y auditoría de IA en Python
├── docker-compose.yml # Orquestación local multi-servicio con hot-reload
└── README.md         # Documentación principal del sistema

```

---

## Guía de Instalación y Despliegue Local

### 1️. Clonar el Repositorio

```bash
git clone [https://github.com/MSanchezVasquez/medisync-clinica-digital.git](https://github.com/MSanchezVasquez/medisync-clinica-digital.git)
cd medisync-peru

```

### 2️. Despliegue con Docker Compose (Recomendado)

Asegúrate de tener **Docker Desktop** abierto y ejecuta en la raíz del proyecto:

```bash
docker compose up -d --build

```

*Esto levantará el backend, frontend y servicios acoplados con **Hot-Reload habilitado** mediante `CHOKIDAR_USEPOLLING=true`.*

---

## Comandos Principales de Ejecución

### 1. Bot RPA de Extraer Reportes (Playwright)

Para ejecutar el bot de automatización robótica de procesos que interactúa de forma autónoma con la plataforma web:

```bash
npx tsx rpa-bot/bot_reporte.ts

```

> **Nota:** La primera vez que lo ejecutes en un nuevo entorno, asegúrate de instalar los navegadores de Playwright:
> ```bash
> npx playwright install
> 
> ```
> 
> 

### 2. Emulador de Telemetría IoT en Tiempo Real

Para iniciar la transmisión continua de constantes vitales (Cama 4 - `DISP-UCI-04`):

```bash
node iot-device/iot-simulador.js

```

### 3. Entorno de Auditoría IA (Streamlit)

Para ejecutar la interfaz de prueba de modelos de Inteligencia Artificial:

```bash
pip install -r streamlit/requirements.txt
streamlit run streamlit/app.py

```

---

## 🧪 Pruebas de Automatización e Integración

1. **Monitoreo IoT:** Inicia el emulador IoT y abre `http://localhost:5173/dashboard`. Verás cómo los valores de *Pulso Cardíaco, Temperatura y SpO2* se actualizan dinámicamente cada 5 segundos.
2. **Flujo de Triaje IA:** Envía un caso sintomático desde el frontend o mediante el flujo automatizado de correo en **Make.com** para recibir la clasificación de urgencia.
3. **Extracción RPA:** Ejecuta el comando `npx tsx rpa-bot/bot_reporte.ts` para presenciar la automatización del navegador completando credenciales y descargando informes clínicos.

---