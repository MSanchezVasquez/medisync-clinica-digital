# UCI virtual de MediSync Perú

## Objetivo

La UCI virtual permite recorrer una sala de cuidados intensivos con un paciente, personal de enfermería y personal médico. La Cama 4 permite consultar la telemetría de un dispositivo IoT. La Cama 5 permite practicar cómo reconocer una interrupción y confirmar que el monitor vuelve a mostrar datos recientes.

## Integración con MediSync

El resultado del triaje y cada registro del historial enlazan con la UCI virtual. La vista recupera el triaje guardado mediante la API autenticada y abre la Cama 5 con el paciente, los síntomas, la urgencia, la especialidad y el peso y la talla si constan en el registro. El monitor de la Cama 5 utiliza telemetría simulada.

En **Triaje → Practicar con un caso ficticio**, se ingresa uno de los DNI de práctica. La ficha y la estación 3D completan la edad, el sexo, el peso, la talla, el pulso, la temperatura y la SpO₂. Al evaluar, el backend envía los síntomas escritos y las mediciones al servicio Gemini. Si el servidor carece de `GEMINI_API_KEY`, solo puede devolver un resultado de demostración para los síntomas de ejemplo del paciente. La evaluación y la captura se comparten con la Cama 5 durante la sesión de la pestaña.

El simulador genera una lectura cada cinco segundos y la envía a `POST /api/sensores`. Express conserva en memoria las últimas 30 lecturas y las publica en `GET /api/sensores/stream`, en orden de llegada inverso. El dashboard y la ruta protegida `/uci-virtual` comparten la consulta periódica. La sala filtra por `DISP-UCI-04` y muestra la lectura más reciente del dispositivo.

Al abrir el monitor de la Cama 4, se muestran pulso, temperatura, SpO₂ y hora de la última lectura en la pantalla 3D y en un panel accesible desde el teclado. Si pasan 15 segundos sin una nueva lectura, el monitor conserva los últimos valores y los marca como desactualizados. Si falla la solicitud, muestra el estado de conexión.

En la Cama 5, el navegador genera lecturas simuladas para `DISP-UCI-05`. El monitor conserva la última lectura y su hora durante un corte, incluso si se recarga la página en la misma pestaña. Al reconectar espera una lectura nueva antes de marcar la señal como recuperada. El estado se conserva por caso en la sesión de la pestaña, sin guardar datos del triaje en el navegador. Si el backend del triaje deja de responder, la simulación iniciada sigue disponible con la lectura guardada.

La sala usa Three.js para el renderizado, React Three Fiber para componer la escena desde React y React Three XR para iniciar una sesión inmersiva con un visor WebXR compatible. La ruta carga la escena y sus dependencias bajo demanda. La demostración de escritorio usa WebGL 2, ratón y teclado. El backend y el contrato HTTP de telemetría se reutilizan.

## Guion de demostración

1. Iniciar sesión, abrir el dashboard y entrar a la UCI virtual.
2. Arrastrar para mirar y usar WASD o las flechas para moverse. Pulsar **Volver a la vista inicial** para regresar al encuadre de entrada.
3. Seleccionar el monitor 3D. Iniciar el simulador contra el mismo backend del frontend y comprobar que cambian los valores y la hora.
4. Detener el simulador. Mostrar el aviso de datos desactualizados y la última lectura conservada.
5. Ir a **Triaje → Practicar con un caso ficticio**, ingresar el DNI y los síntomas, y pulsar **Evaluar triaje** cuando termine la medición. Desde el resultado, elegir **Continuar el caso en la UCI**.
6. Volver al dashboard. Adjuntar el build de frontend o la grabación del recorrido como evidencia de la TA5.

Para generar el build desde la raíz del repositorio, ejecutar `pnpm --dir frontend run build`. El resultado está en `frontend/dist`. Si el frontend se sirve en otro origen, configurar `VITE_API_URL` con la URL base del backend antes de compilar.
