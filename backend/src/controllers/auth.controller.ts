import { type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const loginUsuario = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Debe ingresar email y contraseña.' });
    return;
  }

  try {
    const usuario = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    if (!usuario || !usuario.activo) {
      res
        .status(401)
        .json({ error: 'Credenciales inválidas o usuario deshabilitado.' });
      return;
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      res.status(401).json({ error: 'Credenciales inválidas.' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET || 'medisync_fallback_secret_key';
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        cmp: usuario.cmp,
      },
      jwtSecret,
      { expiresIn: '8h' },
    );

    res.json({
      mensaje: 'Acceso autorizado',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        cmp: usuario.cmp,
      },
    });
  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    res.status(500).json({ error: 'Error interno al procesar el acceso.' });
  }
};

export const obtenerPerfil = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.usuario) {
    res.status(401).json({ error: 'Sesión no válida o no autenticada.' });
    return;
  }

  try {
    const usuario = await prisma.user.findUnique({
      where: { id: req.usuario.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        cmp: true,
        rol: true,
        activo: true,
        creadoEn: true,
      },
    });

    if (!usuario || !usuario.activo) {
      res
        .status(401)
        .json({ error: 'Usuario no encontrado o cuenta deshabilitada.' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('❌ Error al obtener perfil del usuario:', error);
    res
      .status(500)
      .json({ error: 'Error interno al recuperar perfil del usuario.' });
  }
};
