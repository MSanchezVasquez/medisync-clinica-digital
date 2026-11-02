import { Router, type Router as ExpressRouter } from 'express';
import { verificarToken } from '../middlewares/auth.middleware.js';
import {
  autenticarMicrotriaje, listarMicrotriajes, detalleMicrotriaje, cambiarEstadoMicrotriaje, crearMicrotriaje, registrarHello, heartbeat, comandoMicrotriaje,
  crearSesionMedicion, consultarSesion, cancelarSesion, enviarInformeMediciones, progresoMicrotriaje, resultadoMicrotriaje, errorMicrotriaje,
} from '../controllers/microtriaje.controller.js';

const dispositivos: ExpressRouter = Router();
dispositivos.get('/', verificarToken, listarMicrotriajes);
dispositivos.post('/', verificarToken, crearMicrotriaje);
dispositivos.get('/:id/detalle', verificarToken, detalleMicrotriaje);
dispositivos.patch('/:id/activo', verificarToken, cambiarEstadoMicrotriaje);
dispositivos.post('/hello', autenticarMicrotriaje, registrarHello);
dispositivos.post('/heartbeat', autenticarMicrotriaje, heartbeat);
dispositivos.get('/comando', autenticarMicrotriaje, comandoMicrotriaje);
dispositivos.post('/sesiones/:id/progreso', autenticarMicrotriaje, progresoMicrotriaje);
dispositivos.post('/sesiones/:id/resultado', autenticarMicrotriaje, resultadoMicrotriaje);
dispositivos.post('/sesiones/:id/error', autenticarMicrotriaje, errorMicrotriaje);

const mediciones: ExpressRouter = Router();
mediciones.use(verificarToken);
mediciones.post('/', crearSesionMedicion);
mediciones.get('/:id', consultarSesion);
mediciones.post('/:id/cancelar', cancelarSesion);
mediciones.post('/:id/correo', enviarInformeMediciones);

export { dispositivos, mediciones };
