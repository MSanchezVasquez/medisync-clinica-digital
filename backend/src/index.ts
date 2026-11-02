import 'dotenv/config';
import app from './app.js';
import { limpiarSesionesObsoletas } from './controllers/microtriaje.controller.js';

const PORT = process.env.PORT || 3000;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(
    `🚀 Servidor backend de MediSync corriendo en http://localhost:${PORT}`,
  );
  const cicloMicrotriajes = setInterval(() => {
    void limpiarSesionesObsoletas().catch((error) => console.error('Error al actualizar estados MicroTriaje:', error));
  }, 10_000);
  cicloMicrotriajes.unref();
});
