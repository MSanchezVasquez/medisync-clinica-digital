import { Router, type Router as ExpressRouter } from 'express';
import { webhookWhatsapp } from '../controllers/whatsapp.controller.js';

const router: ExpressRouter = Router();

router.post('/', webhookWhatsapp);

export default router;
