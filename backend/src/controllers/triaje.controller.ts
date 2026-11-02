import { type Request, type Response } from 'express';
import { notificarAgenteNoCode } from '../services/nocode.service.js';
import { prisma } from '../lib/prisma.js';

export const obtenerDashboard = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const ahora = new Date();
    const iniciHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );

    const [pacientesHoy, urgenciasAltas] = await Promise.all([
      prisma.triaje.count({
        where: {
          fecha: {
            gte: iniciHoy,
          },
        },
      }),
      prisma.triaje.count({
        where: {
          urgencia: 'ALTA',
        },
      }),
    ]);

    res.json({ pacientesHoy, urgenciasAltas });
  } catch (error) {
    console.error('Error al obtener métricas del dashboard:', error);
    res
      .status(500)
      .json({ error: 'Error interno al consultar métricas del sistema.' });
  }
};

export const listarTriajes = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const triajes = await prisma.triaje.findMany({
      include: { sesionMedicion: { include: { dispositivo: { select: { codigo: true, nombre: true, tipo: true, esSimulado: true, ubicacion: true, firmware: true } } } }, medico: { select: { nombre: true, cmp: true } } },
      orderBy: {
        fecha: 'desc',
      },
    });

    res.json(triajes);
  } catch (error) {
    console.error('Error al consultar triajes en la base de datos: ', error);
    res.status(500).json({
      error: 'No se pudieron obtener los triajes desde la base de datos',
    });
  }
};

export const obtenerTriajePorId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  if (typeof id !== 'string') {
    res
      .status(400)
      .json({ error: 'ID de triaje inválido o no proporcionado.' });
    return;
  }

  try {
    const triaje = await prisma.triaje.findUnique({
      where: { id },
      include: { sesionMedicion: { include: { dispositivo: { select: { codigo: true, nombre: true, tipo: true, esSimulado: true, ubicacion: true, firmware: true } } } }, medico: { select: { nombre: true, cmp: true } } },
    });

    if (!triaje) {
      res.status(404).json({ error: 'Triaje no encontrado.' });
      return;
    }

    res.json(triaje);
  } catch (error) {
    console.error('Error al buscar triaje por ID:', error);
    res.status(500).json({ error: 'Error interno al buscar el triaje.' });
  }
};

export const crearTriaje = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const usuario = (req as any).usuario;
    const {
      nombreCompleto,
      dni,
      edad,
      peso,
      altura,
      telefono,
      sintomas,
      urgencia,
      especialidad,
      recomendacion,
      urgenciaIA,
      sesionMedicionId,
      signosManuales,
      signos,
    } = req.body;

    if (!sintomas || !urgencia || !especialidad || !recomendacion) {
      res
        .status(400)
        .json({ error: 'Los datos clínicos diagnósticos son requeridos.' });
      return;
    }

    let sesion = null;
    if (sesionMedicionId) {
      const sesionEncontrada = await prisma.sesionMedicion.findUnique({ where: { id: String(sesionMedicionId) }, include: { triaje: true } });
      sesion = sesionEncontrada;
      if (!sesion || sesion.estado !== 'COMPLETADA' || sesion.triaje || !sesion.finalizadaEn || Date.now() - sesion.finalizadaEn.getTime() > 15 * 60_000) {
        res.status(409).json({ error: 'La medición no está disponible o venció. Repita la medición.' });
        return;
      }
      if (sesion.iniciadaPorId !== usuario?.id && usuario?.rol !== 'ADMIN') {
        res.status(403).json({ error: 'No tiene acceso a esta medición.' });
        return;
      }
    }

    const nuevoTriaje = await prisma.$transaction(async (tx) => {
      const creado = await tx.triaje.create({
      data: {
        nombreCompleto: nombreCompleto?.trim() || null,
        dni: dni?.trim() || null,
        edad: edad ? Number(edad) : null,
        peso: peso ? Number(peso) : null,
        altura: altura ? Number(altura) : null,
        telefono: telefono?.trim() || null,
        sintomas: sintomas.trim(),
        urgencia: String(urgencia).toUpperCase(),
        especialidad: especialidad.trim(),
        recomendacion: recomendacion.trim(),
        ...(usuario?.id ? { medico: { connect: { id: usuario.id } } } : {}),
        urgenciaIA: String(urgenciaIA || urgencia).toUpperCase(),
        signosManuales: Boolean(signosManuales && signos),
        ...(sesion ? { sesionMedicion: { connect: { id: sesion.id } } } : {}),
        frecuenciaCardiaca: sesion?.frecuenciaCardiaca ?? (Number(signos?.frecuenciaCardiaca) || null),
        spo2: sesion?.spo2 ?? (Number(signos?.spo2) || null),
        temperatura: sesion?.temperatura ?? (Number(signos?.temperatura) || null),
        presionSistolica: sesion?.presionSistolica ?? (Number(signos?.presionSistolica) || null),
        presionDiastolica: sesion?.presionDiastolica ?? (Number(signos?.presionDiastolica) || null),
        frecuenciaRespiratoria: sesion?.frecuenciaRespiratoria ?? (Number(signos?.frecuenciaRespiratoria) || null),
        news2: sesion?.news2 ?? null,
        news2Riesgo: sesion?.news2 == null ? null : sesion.news2 >= 7 ? 'ALTO' : sesion.news2 >= 5 ? 'MEDIO' : 'BAJO',
        news2Parcial: sesion?.news2 == null || sesion.presionSistolica == null || sesion.frecuenciaRespiratoria == null,
      },
      });
      if (sesion) await tx.dispositivo.update({ where: { id: sesion.dispositivoId }, data: { estado: 'LIBRE' } });
      return creado;
    });

    // 🚀 Integración del Agente No-Code operativo
    void notificarAgenteNoCode({
      id: nuevoTriaje.id,
      dni: nuevoTriaje.dni,
      edad: nuevoTriaje.edad,
      sintomas: nuevoTriaje.sintomas,
      urgencia: nuevoTriaje.urgencia,
      especialidad: nuevoTriaje.especialidad,
      recomendacion: nuevoTriaje.recomendacion,
    });

    res.status(201).json(nuevoTriaje);
  } catch (error) {
    console.error('Error al crear triaje:', error);
    res.status(500).json({ error: 'Error interno al registrar el triaje.' });
  }
};

export const actualizarTriaje = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const {
      nombreCompleto,
      dni,
      edad,
      peso,
      altura,
      telefono,
      sintomas,
      urgencia,
      especialidad,
      recomendacion,
    } = req.body;

    const existe = await prisma.triaje.findUnique({ where: { id } });
    if (!existe) {
      res.status(404).json({ error: 'El triaje solicitado no existe.' });
      return;
    }

    const triajeActualizado = await prisma.triaje.update({
      where: { id },
      data: {
        nombreCompleto: nombreCompleto ? String(nombreCompleto).trim() : null,
        dni: dni ? String(dni).trim() : null,
        edad: edad ? Number(edad) : null,
        peso: peso ? Number(peso) : null,
        altura: altura ? Number(altura) : null,
        telefono: telefono ? String(telefono).trim() : null,
        sintomas: sintomas ? String(sintomas).trim() : existe.sintomas,
        urgencia: urgencia ? String(urgencia).toUpperCase() : existe.urgencia,
        especialidad: especialidad
          ? String(especialidad).trim()
          : existe.especialidad,
        recomendacion: recomendacion
          ? String(recomendacion).trim()
          : existe.recomendacion,
      },
    });

    res.json(triajeActualizado);
  } catch (error) {
    console.error('❌ Error al actualizar triaje:', error);
    res.status(500).json({ error: 'Error interno al actualizar el triaje.' });
  }
};

export const eliminarTriaje = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = String(req.params.id);

    const triaje = await prisma.triaje.findUnique({
      where: { id },
    });

    if (!triaje) {
      res
        .status(404)
        .json({ error: 'El triaje no existe o ya fue eliminado.' });
      return;
    }

    await prisma.triaje.delete({
      where: { id },
    });

    res.json({ mensaje: 'Triaje clínico eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar triaje:', error);
    res.status(500).json({ error: 'Error interno al eliminar el triaje.' });
  }
};
