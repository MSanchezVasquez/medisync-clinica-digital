import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  id: string;
  email: string;
  nombre: string;
  rol: 'ADMIN' | 'MEDICO' | 'ENFERMERO';
  cmp?: string;
}

// Extender la interfaz Request de Express
declare global {
  namespace Express {
    interface Request {
      usuario?: AuthPayload;
    }
  }
}

export const verificarToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Guarda para estrechar el tipo de 'string | undefined' a 'string'
  if (!token) {
    res
      .status(401)
      .json({ error: 'Acceso denegado. Formato de token inválido.' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET || 'medisync_fallback_secret_key';

  try {
    const decoded = jwt.verify(token, jwtSecret) as unknown as AuthPayload;
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};