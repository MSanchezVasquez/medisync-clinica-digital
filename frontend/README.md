# MediSync Perú - Frontend

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

Cliente web de MediSync Perú desarrollado con React, TypeScript, Vite y Tailwind CSS v4.

## Funcionalidades

- Formulario de pre-triaje con DNI, edad, peso, altura y síntomas.
- Consulta asíncrona del nombre del paciente a través del backend.
- Evaluación mediante Gemini con urgencias `ALTA`, `MEDIA`, `BAJA` y `NULA`.
- Guardado automático de resultados, excepto cuando la urgencia es `NULA`.
- Dashboard con métricas obtenidas desde el backend.
- Historial de pacientes con descarga de informes PDF.
- Edición mediante redirección a `/triaje`.
- Reevaluación automática del nombre y del resultado al editar.
- Eliminación de registros con confirmación.
- Navegación entre Inicio y Triaje.
- Modo oscuro persistente, diseño adaptable, animaciones GSAP y notificaciones Sonner.
- Iconos SVG sin emojis.

## Rutas

- `/login`: acceso de demostración.
- `/dashboard`: métricas e historial.
- `/triaje`: registro, consulta de DNI y evaluación.

## Estructura

```text
frontend/
├── src/
│   ├── components/
│   │   └── Header.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   └── Triaje.tsx
│   ├── utils/
│   │   └── informeTriaje.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── pnpm-workspace.yaml
├── package.json
└── vite.config.ts
```

## Instalación

```bash
pnpm install
```

La configuración `pnpm-workspace.yaml` autoriza el script de instalación de `core-js`, dependencia indirecta utilizada por la generación de PDF.

## Desarrollo

Primero inicia el backend en `http://localhost:3000`. Después ejecuta:

```bash
pnpm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Compilación

```bash
pnpm run build
```

## Cuenta de demostración

```text
Usuario: admin
Contraseña: 1234
```

## Advertencias

- El resultado del pre-triaje es informativo y no reemplaza una consulta médica.
- La información obtenida por DNI debe ser comprobada antes de utilizarse.
- El frontend requiere que el backend esté encendido para consultar el DNI, evaluar síntomas y administrar el historial.
