import { Router, type Router as ExpressRouter } from 'express';
import { loginUsuario, obtenerPerfil } from '../controllers/auth.controller.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router: ExpressRouter = Router();

router.post('/login', loginUsuario);
router.get('/me', verificarToken, obtenerPerfil);

export default router;
