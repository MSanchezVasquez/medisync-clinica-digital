import { type Request, type Response } from 'express';

let metricasIoTRecientes: any[] = [];

export const registrarSensor = (req: Request, res: Response): void => {
  const metrica = req.body;
  metricasIoTRecientes.unshift({
    ...metrica,
    timestamp: new Date().toISOString(),
  });
  if (metricasIoTRecientes.length > 30) metricasIoTRecientes.pop();

  res
    .status(201)
    .json({ mensaje: 'Telemetría IoT registrada exitosamente', metrica });
};

export const streamSensores = (_req: Request, res: Response): void => {
  res.json(metricasIoTRecientes);
};
