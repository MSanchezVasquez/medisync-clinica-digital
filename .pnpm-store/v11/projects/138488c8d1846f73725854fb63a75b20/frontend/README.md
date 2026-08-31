# MediSync Perú - Frontend Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=white)

Este repositorio contiene el módulo **Frontend** de **MediSync Perú**, una plataforma digital de gestión hospitalaria y pre-triaje automatizado. La aplicación está diseñada para optimizar los flujos de atención en áreas de emergencias mediante interfaces modernas, seguras y de alto rendimiento.

---

## Características Principales

- **Autenticación de Sesión:** Gestión de acceso administrativo con validación local y persistencia de sesión mediante `localStorage`, sentando las bases para una futura integración con tokens JWT.
- **Motor de Pre-Triaje con IA:** Formulario interactivo conectado a un backend (Express + Google Gemini) para procesar síntomas, determinar niveles de urgencia y sugerir especialidades médicas en milisegundos.
- **Experiencia de Usuario Premium (UX/UI):**
  - Animaciones fluidas y microinteracciones de tarjetas gestionadas por **GSAP**.
  - Sistema de notificaciones no intrusivas (_Toasts_) implementado con **Sonner**.
  - Soporte nativo para **Modo Oscuro** con persistencia local, configurado mediante Tailwind CSS v4.
- **Arquitectura SPA:** Navegación instantánea mediante `react-router-dom` con enrutamiento de vistas (Login, Dashboard, Triaje).

---

## Alineamiento Académico (Herramientas de Desarrollo Profesional - TIC)

Este proyecto está desarrollado aplicando los estándares exigidos en el curso, específicamente alineado con la **Unidad 1: DevOps y Automatización de Procesos**.

### 1. Integración y Despliegue Continuos (CI/CD Local)

- **Calidad de Código:** Integración de **ESLint (Flat Config)** y **Prettier** para garantizar un estándar de escritura uniforme.
- **Automatización:** Implementación de _Hooks_ de pre-commit utilizando **Husky**. Ningún código con errores de sintaxis o formato incorrecto puede ser subido al repositorio principal.

### 2. Preparación para Contenedorización

- El código fuente está estructurado de forma modular, preparando el entorno para su posterior despliegue en infraestructuras aisladas[cite: 1].
- Se proyecta encapsular este cliente React utilizando **Docker**, creando una imagen base de alta eficiencia y portabilidad capaz de despachar los archivos estáticos utilizando **Nginx**.

---

## Estructura del Proyecto

```text
frontend/
├── src/
│   ├── components/      # Componentes UI reutilizables (Ej. Header.tsx)
│   ├── pages/           # Vistas principales de la aplicación (Login, Dashboard, Triaje)
│   ├── App.tsx          # Enrutador principal y Layout
│   ├── main.tsx         # Punto de entrada de React
│   └── index.css        # Estilos globales y directivas de Tailwind v4
├── eslint.config.js     # Reglas de análisis estático
├── vite.config.ts       # Configuración del empaquetador
└── package.json         # Dependencias y scripts
```

---

## Instalación y Configuración

Sigue estos pasos para desplegar el entorno de desarrollo localmente:

### 1. Clonar el repositorio

```bash
git clone https://github.com/MSanchezVasquez/medisync-clinica-digital.git
cd medisync-clinica-digital/frontend
```

### 2. Instalar dependencias

El proyecto utiliza `pnpm` como gestor de paquetes principal por su rapidez y eficiencia.

```bash
pnpm install
```

### 3. Ejecutar el servidor de desarrollo

Asegúrate de tener el servidor backend de Express encendido para que el motor de IA responda correctamente.

```bash
pnpm run dev
```

La aplicación estará disponible en `http://localhost:5173`.
