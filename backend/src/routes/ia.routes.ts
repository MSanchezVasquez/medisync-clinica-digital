import { Router, type Router as ExpressRouter } from 'express';
import {
  estadoIa,
  obtenerPrompts,
  obtenerPacientePractica,
  evaluarPractica,
  evaluarIa,
} from '../controllers/ia.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ExpressRouter = Router();

router.get('/estado', estadoIa);
router.get('/prompts', obtenerPrompts);
router.get('/practica/pacientes/:dni', verificarToken, obtenerPacientePractica);
router.post('/practica', verificarToken, evaluarPractica);
router.post('/', evaluarIa);

export default router;
