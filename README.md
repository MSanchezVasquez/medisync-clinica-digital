# 🏥 MediSync Perú - Plataforma Integral Hospitalaria (Monorepo)

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)

MediSync Perú es una plataforma digital avanzada para la gestión hospitalaria y el pre-triaje automatizado. Este repositorio está estructurado como un **monorepo**, albergando tanto la interfaz de usuario (Frontend) como el servidor de servicios e Inteligencia Artificial (Backend).

## 🚀 Arquitectura del Sistema

El proyecto está dividido en dos módulos principales que operan en conjunto bajo estándares estrictos de calidad de código:

- **`/frontend`**: Aplicación de una sola página (SPA) construida con React, Vite y Tailwind CSS v4. Gestiona la experiencia del usuario, persistencia de sesión local, sistema de notificaciones y animaciones de alto rendimiento.
- **`/backend`**: API RESTful desarrollada con Node.js y Express. Procesa la lógica de negocio, políticas de CORS y la integración con el motor de Google Gemini AI para emitir diagnósticos.

## ✨ Características Globales

- **Motor de Pre-Triaje con IA:** Evaluación instantánea de síntomas con sugerencias de especialidad médica y niveles de urgencia.
- **Seguridad y Accesos:** Panel administrativo protegido con validación de credenciales en local.
- **Ecosistema DevOps (CI/CD):**
  - Formateo y validación estática rigurosa mediante **ESLint** (Flat Config) y **Prettier**.
  - Automatización con **Husky** mediante ganchos de pre-commit para bloquear código con errores antes de subirlo al repositorio.
- **Preparación para IoT y Contenedores:**
  - Infraestructura diseñada para la futura conexión de dispositivos de telemetría médica.
  - Empaquetado planificado con Docker. Los contenedores representan una solución moderna, ligera y eficiente para desarrollar, empaquetar y desplegar aplicaciones de forma consistente en cualquier entorno[cite: 1].

## 🎓 Contexto Académico

Proyecto desarrollado en el marco del curso **Herramientas de Desarrollo Profesional - TIC** (Universidad Tecnológica del Perú). La arquitectura aplica los conceptos de la **Unidad 1: DevOps y Automatización de Procesos**[cite: 1]. Actualmente, el sistema se está preparando para la fase de contenedorización utilizando Docker para asegurar el aislamiento a nivel de proceso y una ejecución consistente[cite: 1].

## ⚙️ Guía de Ejecución

Al ser un monorepositorio, los módulos deben levantarse en terminales independientes.

### 1. Desplegar el Servidor (Terminal 1)

```bash
cd backend
pnpm install
# Requiere archivo .env con GEMINI_API_KEY
pnpm run dev
```

### 2. Desplegar el Cliente (Terminal 2)

```bash
cd frontend
pnpm install
pnpm run dev
```

---
