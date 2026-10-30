import express, { type Application } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import triajeRoutes from './routes/triaje.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import dniRoutes from './routes/dni.routes.js';
import iaRoutes from './routes/ia.routes.js';
import sensorRoutes from './routes/sensor.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';

const app: Application = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/triajes', triajeRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/consultar-dni', dniRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/estado-ia', iaRoutes);
app.use('/api/triaje', iaRoutes);
app.use('/api/sensores', sensorRoutes);
app.use('/api/webhook/whatsapp', whatsappRoutes);

export default app;
