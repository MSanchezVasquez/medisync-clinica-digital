import { Router, type Router as ExpressRouter } from 'express';
import {
  obtenerDashboard,
  listarTriajes,
  obtenerTriajePorId,
  crearTriaje,
  actualizarTriaje,
  eliminarTriaje,
} from '../controllers/triaje.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ExpressRouter = Router();

router.get('/dashboard', verificarToken, obtenerDashboard);
router.get('/', verificarToken, listarTriajes);
router.get('/:id', verificarToken, obtenerTriajePorId);
router.post('/', verificarToken, crearTriaje);
router.put('/:id', verificarToken, actualizarTriaje);
router.delete('/:id', verificarToken, eliminarTriaje);

export default router;
