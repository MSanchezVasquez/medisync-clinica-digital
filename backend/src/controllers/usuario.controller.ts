import { type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const registrarUsuario = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password, nombre, cmp, rol } = req.body;

    if (!email || !password || !nombre) {
      res
        .status(400)
        .json({ error: 'Email, contraseña y nombre son campos obligatorios.' });
      return;
    }

    const existe = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existe) {
      res
        .status(409)
        .json({ error: 'El correo electrónico ya se encuentra registrado.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoUsuario = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: passwordHash,
        nombre: nombre.trim(),
        cmp: cmp ? cmp.trim() : null,
        rol: rol === 'ADMIN' ? 'ADMIN' : 'MEDICO',
      },
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

    res.status(201).json({
      mensaje: 'Personal médico registrado exitosamente.',
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno al crear el usuario.' });
  }
};

export const listarUsuarios = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        cmp: true,
        rol: true,
        activo: true,
        creadoEn: true,
        _count: {
          select: { triajes: true },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno al listar los usuarios.' });
  }
};

export const cambiarEstadoUsuario = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const usuarioSolicitante = (req as any).usuario;

    if (usuarioSolicitante.id === id) {
      res
        .status(400)
        .json({
          error: 'No puede desactivar su propia cuenta de administrador.',
        });
      return;
    }

    const usuarioExistente = await prisma.user.findUnique({ where: { id } });
    if (!usuarioExistente) {
      res.status(404).json({ error: 'El usuario especificado no existe.' });
      return;
    }

    const usuarioActualizado = await prisma.user.update({
      where: { id },
      data: { activo: !usuarioExistente.activo },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });

    res.json({
      mensaje: `Usuario ${usuarioActualizado.activo ? 'activado' : 'suspendido'} exitosamente.`,
      usuario: usuarioActualizado,
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res
      .status(500)
      .json({ error: 'Error interno al actualizar estado del usuario.' });
  }
};
