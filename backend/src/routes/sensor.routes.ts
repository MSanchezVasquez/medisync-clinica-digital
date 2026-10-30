import { Router, type Router as ExpressRouter } from 'express';
import {
  registrarSensor,
  streamSensores,
} from '../controllers/sensor.controller.js';

const router: ExpressRouter = Router();

router.post('/', registrarSensor);
router.get('/stream', streamSensores);

export default router;
