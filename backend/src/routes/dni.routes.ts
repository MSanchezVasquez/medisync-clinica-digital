import { Router, type Router as ExpressRouter } from 'express';
import { consultarDni } from '../controllers/dni.controller.js';

const router: ExpressRouter = Router();

router.post('/', consultarDni);

export default router;
