# UCI virtual de MediSync Perú

## Objetivo

La UCI virtual permite recorrer una sala de cuidados intensivos con un paciente, personal de enfermería y personal médico. La Cama 4 permite consultar la telemetría de un dispositivo IoT. La Cama 5 permite practicar cómo reconocer una interrupción y confirmar que el monitor vuelve a mostrar datos recientes.

## Integración con MediSync

El simulador genera una lectura cada cinco segundos y la envía a `POST /api/sensores`. Express conserva en memoria las últimas 30 lecturas y las publica en `GET /api/sensores/stream`, en orden de llegada inverso. El dashboard y la ruta protegida `/uci-virtual` comparten la consulta periódica. La sala filtra por `DISP-UCI-04` y muestra la lectura más reciente del dispositivo.

Al seleccionar la cama, se resalta su estructura. Al seleccionar el monitor, se muestran pulso, temperatura, SpO₂ y hora de la última lectura en la pantalla 3D y en un panel accesible desde el teclado. Si pasan 15 segundos sin una nueva lectura, el monitor conserva los últimos valores y los marca como desactualizados. Si falla la solicitud, muestra el estado de conexión.

En la Cama 5, el navegador genera lecturas de entrenamiento para `DISP-UCI-05`. Al pulsar **Simular interrupción** o el módulo iluminado debajo de la pantalla 3D, se detienen las actualizaciones y aparece **Señal interrumpida** junto a la última lectura. El módulo cambia a ámbar. Al restablecer la señal, el monitor muestra una lectura nueva y vuelve a actualizarse. Este ejercicio usa datos locales de entrenamiento.

La sala usa Three.js para el renderizado, React Three Fiber para componer la escena desde React y React Three XR para iniciar una sesión inmersiva con un visor WebXR compatible. La ruta carga la escena y sus dependencias bajo demanda. La demostración de escritorio usa WebGL 2, ratón y teclado. El backend y el contrato HTTP de telemetría se reutilizan.

## Guion de demostración

1. Iniciar sesión, abrir el dashboard y entrar a la UCI virtual.
2. Arrastrar para mirar, usar WASD o las flechas para moverse y seleccionar la cama en la escena.
3. Seleccionar el monitor 3D. Iniciar el simulador contra el mismo backend del frontend y comprobar que cambian los valores y la hora.
4. Detener el simulador. Mostrar el aviso de datos desactualizados y la última lectura conservada.
5. Elegir **Pérdida de señal · Cama 5**. Abrir el monitor, simular la interrupción y comprobar que los valores y la hora se conservan.
6. Pulsar el módulo ámbar de la escena para restablecer la señal. Confirmar el cambio de estado y la actualización de la hora. Repetir con el botón del panel para probar el acceso con teclado.
7. Volver al dashboard. Adjuntar el build de frontend o la grabación del recorrido como evidencia de la TA5.

Para generar el build desde la raíz del repositorio, ejecutar `pnpm --dir frontend run build`. El resultado está en `frontend/dist`. Si el frontend se sirve en otro origen, configurar `VITE_API_URL` con la URL base del backend antes de compilar.
