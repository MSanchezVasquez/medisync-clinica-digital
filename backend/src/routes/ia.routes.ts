import { Router, type Router as ExpressRouter } from 'express';
import {
  estadoIa,
  obtenerPrompts,
  evaluarIa,
} from '../controllers/ia.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ExpressRouter = Router();

router.get('/estado', estadoIa);
router.get('/prompts', obtenerPrompts);
router.post('/', verificarToken, evaluarIa);

export default router;
