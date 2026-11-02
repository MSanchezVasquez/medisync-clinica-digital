import express, { type Application } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import triajeRoutes from './routes/triaje.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import dniRoutes from './routes/dni.routes.js';
import iaRoutes from './routes/ia.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import { dispositivos, mediciones } from './routes/microtriaje.routes.js';

import { estadoIa } from './controllers/ia.controller.js';

const app: Application = express();

app.use(cors());
app.use(express.json());

app.get('/api/estado-ia', estadoIa);

app.use('/api/auth', authRoutes);
app.use('/api/triajes', triajeRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/consultar-dni', dniRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/estado-ia', iaRoutes);
app.use('/api/triaje', iaRoutes);
app.use('/api/dispositivos', dispositivos);
app.use('/api/mediciones', mediciones);
app.use('/api/webhook/whatsapp', whatsappRoutes);

export default app;
