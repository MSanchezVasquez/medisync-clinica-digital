import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { validarSignos } from '../services/signosVitales.js';
import { calcularNews2 } from '../services/news2.js';
import { enviarReporteMicrotriaje } from '../services/correo.service.js';

type DeviceRequest = Request & { microtriaje?: { id: string; codigo: string; esSimulado: boolean; estado: string } };
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

export const autenticarMicrotriaje = async (req: DeviceRequest, res: Response, next: NextFunction) => {
  const codigo = req.header('X-Device-Code');
  const clave = req.header('X-Device-Key');
  if (!codigo || !clave) { res.status(401).json({ error: 'Faltan credenciales del dispositivo.' }); return; }
  try {
    const d = await prisma.dispositivo.findUnique({ where: { codigo } });
    const actual = hash(clave);
    const esperado = d?.claveHash ?? '0'.repeat(actual.length);
    const ok = !!d && d.activo && actual.length === esperado.length && timingSafeEqual(Buffer.from(actual), Buffer.from(esperado));
    if (!ok || !d) { res.status(401).json({ error: 'Dispositivo no autorizado.' }); return; }
    req.microtriaje = { id: d.id, codigo: d.codigo, esSimulado: d.esSimulado, estado: d.estado };
    next();
  } catch { res.status(500).json({ error: 'No se pudo autenticar el dispositivo.' }); }
};

export const listarMicrotriajes = async (_req: Request, res: Response) => {
  const dispositivos = await prisma.dispositivo.findMany({ orderBy: { codigo: 'asc' } });
  const ahora = Date.now();
  res.json(dispositivos.map((d) => ({ ...d, claveHash: undefined,
    estado: !d.activo ? 'APAGADO' : !d.ultimoLatido || ahora - d.ultimoLatido.getTime() > 30_000 ? 'OFFLINE' : d.estado,
  })));
};

export const detalleMicrotriaje = async (req: Request, res: Response) => {
  const dispositivo = await prisma.dispositivo.findUnique({ where: { id: String(req.params.id) }, select: {
    id: true, codigo: true, nombre: true, tipo: true, esSimulado: true, ubicacion: true,
    firmware: true, sensores: true, estado: true, activo: true, bateria: true, senalWifi: true, ultimoLatido: true,
  } });
  if (!dispositivo) { res.status(404).json({ error: 'MicroTriaje no encontrado.' }); return; }
  const sesiones = await prisma.sesionMedicion.findMany({
    where: { dispositivoId: dispositivo.id, estado: 'COMPLETADA' },
    orderBy: { finalizadaEn: 'desc' }, take: 8,
    select: { id: true, finalizadaEn: true, duracionSeg: true, calidad: true, frecuenciaCardiaca: true, spo2: true,
      temperatura: true, presionSistolica: true, presionDiastolica: true, frecuenciaRespiratoria: true, news2: true, alertas: true, muestras: true },
  });
  res.json({ ...dispositivo, estado: !dispositivo.activo ? 'APAGADO' : dispositivo.estado, sesiones });
};

export const cambiarEstadoMicrotriaje = async (req: Request, res: Response) => {
  const usuario = (req as Request & { usuario?: { rol: string } }).usuario;
  if (usuario?.rol !== 'ADMIN') { res.status(403).json({ error: 'Solo ADMIN puede encender o apagar equipos.' }); return; }
  if (typeof req.body?.activo !== 'boolean') { res.status(400).json({ error: 'Indique activo como verdadero o falso.' }); return; }
  const id = String(req.params.id);
  const d = await prisma.dispositivo.findUnique({ where: { id } });
  if (!d) { res.status(404).json({ error: 'MicroTriaje no encontrado.' }); return; }
  if (d.esSimulado && ['RESERVADO', 'MIDIENDO'].includes(d.estado)) { res.status(409).json({ error: 'No se puede apagar una estación con una medición activa.' }); return; }
  const actual = await prisma.dispositivo.update({ where: { id }, data: {
    activo: req.body.activo,
    estado: 'OFFLINE',
  } });
  res.json({ id: actual.id, activo: actual.activo, estado: actual.activo ? 'OFFLINE' : 'APAGADO' });
};

export const crearMicrotriaje = async (req: Request, res: Response) => {
  const usuario = (req as Request & { usuario?: { rol: string } }).usuario;
  if (usuario?.rol !== 'ADMIN') { res.status(403).json({ error: 'Solo ADMIN puede vincular equipos.' }); return; }
  const { nombre, tipo, ubicacion } = req.body ?? {};
  if (typeof nombre !== 'string' || !nombre.trim() || !['ESTACION_BASICA', 'MONITOR_MULTIPARAMETRO'].includes(tipo)) {
    res.status(400).json({ error: 'Indique nombre y tipo de MicroTriaje válidos.' }); return;
  }
  const codigo = `${tipo === 'ESTACION_BASICA' ? 'MT-100' : 'MT-300'}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const clave = randomBytes(24).toString('base64url');
  const sensores = tipo === 'ESTACION_BASICA' ? ['FC', 'SPO2', 'TEMP'] : ['FC', 'SPO2', 'TEMP', 'PA', 'FR'];
  const dispositivo = await prisma.dispositivo.create({ data: {
    id: randomUUID(), codigo, nombre: nombre.trim(), tipo, esSimulado: false,
    ubicacion: typeof ubicacion === 'string' ? ubicacion.trim() : null, sensores, claveHash: hash(clave),
  } });
  const { claveHash: _secreto, ...publico } = dispositivo;
  res.status(201).json({ ...publico, clave });
};

export const registrarHello = async (req: DeviceRequest, res: Response) => {
  const d = req.microtriaje!;
  await prisma.dispositivo.update({ where: { id: d.id }, data: {
    firmware: String(req.body.firmware ?? '').slice(0, 80), sensores: Array.isArray(req.body.sensores) ? req.body.sensores.map(String) : [],
    bateria: Number.isFinite(Number(req.body.bateria)) ? Math.max(0, Math.min(100, Number(req.body.bateria))) : null,
    senalWifi: Number.isFinite(Number(req.body.rssi)) ? Number(req.body.rssi) : null,
    ultimoLatido: new Date(), estado: 'LIBRE',
  } });
  res.json({ ok: true, intervaloHeartbeatSeg: 10, intervaloPollSeg: 2 });
};

export const heartbeat = async (req: DeviceRequest, res: Response) => {
  const d = req.microtriaje!;
  await prisma.dispositivo.update({ where: { id: d.id }, data: {
    ultimoLatido: new Date(),
    ...(d.estado === 'OFFLINE' ? { estado: 'LIBRE' as const } : {}),
    ...(Number.isFinite(Number(req.body.bateria)) ? { bateria: Number(req.body.bateria) } : {}),
    ...(Number.isFinite(Number(req.body.rssi)) ? { senalWifi: Number(req.body.rssi) } : {}),
  } });
  res.json({ ok: true });
};

export const comandoMicrotriaje = async (req: DeviceRequest, res: Response) => {
  const d = req.microtriaje!;
  const sesion = await prisma.sesionMedicion.findFirst({ where: { dispositivoId: d.id, estado: 'ESPERANDO_PACIENTE' }, orderBy: { creadaEn: 'asc' } });
  if (!sesion) { res.json({ accion: 'NINGUNA' }); return; }
  await prisma.sesionMedicion.update({ where: { id: sesion.id }, data: { estado: 'MIDIENDO', iniciadaEn: new Date() } });
  await prisma.dispositivo.update({ where: { id: d.id }, data: { estado: 'MIDIENDO' } });
  res.json({ accion: 'INICIAR_MEDICION', sesionId: sesion.id,
    // No se entrega identidad del paciente al dispositivo.
    perfil: d.esSimulado ? { edad: sesion.edadPaciente ?? 35, sintomas: sesion.sintomasHint, escenario: sesion.escenario } : {}, timeoutSeg: 180,
  });
};

export const crearSesionMedicion = async (req: Request, res: Response) => {
  const { dispositivoId, edad, sintomas, escenario } = req.body ?? {};
  if (typeof dispositivoId !== 'string') { res.status(400).json({ error: 'Seleccione un MicroTriaje.' }); return; }
  const dispositivo = await prisma.dispositivo.findUnique({ where: { id: dispositivoId } });
  if (!dispositivo || !dispositivo.activo) { res.status(404).json({ error: 'MicroTriaje no encontrado.' }); return; }
  if (dispositivo.estado !== 'LIBRE' || !dispositivo.ultimoLatido || Date.now() - dispositivo.ultimoLatido.getTime() > 30_000) {
    res.status(409).json({ error: 'El MicroTriaje no está conectado y libre.' }); return;
  }
  const usuario = (req as Request & { usuario?: { id: string } }).usuario;
  try {
    const sesion = await prisma.$transaction(async (tx) => {
      const reserva = await tx.dispositivo.updateMany({ where: { id: dispositivo.id, estado: 'LIBRE' }, data: { estado: 'RESERVADO' } });
      if (!reserva.count) throw new Error('RESERVA_OCUPADA');
      return tx.sesionMedicion.create({ data: { dispositivoId, iniciadaPorId: usuario?.id ?? null,
        edadPaciente: Number.isFinite(Number(edad)) ? Number(edad) : null,
        sintomasHint: dispositivo.esSimulado && typeof sintomas === 'string' ? sintomas.slice(0, 500) : null,
        escenario: dispositivo.esSimulado && typeof escenario === 'string' ? escenario : null,
      } });
    });
    res.status(201).json(sesion);
  } catch (e) { res.status(409).json({ error: (e as Error).message === 'RESERVA_OCUPADA' ? 'El MicroTriaje acaba de ser reservado.' : 'No se pudo reservar el equipo.' }); }
};

export const consultarSesion = async (req: Request, res: Response) => {
  const sesion = await prisma.sesionMedicion.findUnique({ where: { id: String(req.params.id) }, include: { dispositivo: { select: { codigo: true, nombre: true, tipo: true, esSimulado: true, ubicacion: true, firmware: true } } } });
  if (!sesion) { res.status(404).json({ error: 'Sesión no encontrada.' }); return; }
  res.json({ ...sesion, dispositivo: { ...sesion.dispositivo, claveHash: undefined } });
};

export const cancelarSesion = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const s = await prisma.sesionMedicion.findUnique({ where: { id } });
  if (!s || ['COMPLETADA', 'CANCELADA', 'ERROR', 'EXPIRADA'].includes(s.estado)) { res.status(409).json({ error: 'La sesión ya terminó.' }); return; }
  await prisma.$transaction([
    prisma.sesionMedicion.update({ where: { id }, data: { estado: 'CANCELADA', finalizadaEn: new Date() } }),
    prisma.dispositivo.update({ where: { id: s.dispositivoId }, data: { estado: 'LIBRE' } }),
  ]);
  res.json({ ok: true });
};

export const enviarInformeMediciones = async (req: Request, res: Response) => {
  const usuario = (req as Request & { usuario?: { id: string; rol: string } }).usuario;
  const correo = typeof req.body?.correo === 'string' ? req.body.correo.trim() : '';
  const pdfBase64 = typeof req.body?.pdfBase64 === 'string' ? req.body.pdfBase64 : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { res.status(400).json({ error: 'Escribe un correo destinatario válido.' }); return; }
  if (!pdfBase64 || pdfBase64.length > 2_200_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(pdfBase64)) {
    res.status(413).json({ error: 'El PDF no es válido o supera el tamaño permitido.' }); return;
  }
  const pdf = Buffer.from(pdfBase64, 'base64');
  if (pdf.length > 1_600_000 || pdf.subarray(0, 5).toString() !== '%PDF-') { res.status(400).json({ error: 'El archivo adjunto debe ser un PDF válido.' }); return; }
  const sesion = await prisma.sesionMedicion.findUnique({ where: { id: String(req.params.id) }, include: { dispositivo: { select: { codigo: true } } } });
  if (!sesion || sesion.estado !== 'COMPLETADA') { res.status(404).json({ error: 'No se encontró una medición completada.' }); return; }
  if (sesion.iniciadaPorId !== usuario?.id && usuario?.rol !== 'ADMIN') { res.status(403).json({ error: 'No tienes acceso a esta medición.' }); return; }
  const codigo = sesion.dispositivo.codigo.replace(/[^a-zA-Z0-9-]/g, '');
  const fecha = (sesion.finalizadaEn || new Date()).toISOString().slice(0, 10);
  try {
    await enviarReporteMicrotriaje(correo, pdf, `mediciones-${codigo}-${fecha}.pdf`);
    res.json({ enviado: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'CORREO_NO_CONFIGURADO') { res.status(503).json({ error: 'El correo todavía no está configurado. Añade las variables SMTP y reinicia el backend.' }); return; }
    console.error('No se pudo enviar el reporte de mediciones:', error);
    res.status(502).json({ error: 'El servidor de correo no pudo enviar el informe.' });
  }
};

export const progresoMicrotriaje = async (req: DeviceRequest, res: Response) => {
  const s = await prisma.sesionMedicion.findUnique({ where: { id: String(req.params.id) } });
  if (!s || s.dispositivoId !== req.microtriaje!.id) { res.status(404).json({ error: 'Sesión no encontrada para este equipo.' }); return; }
  if (s.estado === 'CANCELADA') { res.json({ ok: true, cancelar: true }); return; }
  if (s.estado !== 'MIDIENDO') { res.status(409).json({ error: 'La sesión no está activa.' }); return; }
  const muestra = req.body.muestra && typeof req.body.muestra === 'object' ? req.body.muestra : null;
  const muestras = Array.isArray(s.muestras) ? [...s.muestras, ...(muestra ? [muestra] : [])].slice(-60) : (muestra ? [muestra] : []);
  await prisma.sesionMedicion.update({ where: { id: s.id }, data: {
    fase: String(req.body.fase ?? ''), progreso: Math.max(0, Math.min(100, Number(req.body.progreso) || 0)),
    muestras: muestras as never,
  } });
  res.json({ ok: true, cancelar: false });
};

export const resultadoMicrotriaje = async (req: DeviceRequest, res: Response) => {
  const s = await prisma.sesionMedicion.findUnique({ where: { id: String(req.params.id) }, include: { dispositivo: true } });
  if (!s || s.dispositivoId !== req.microtriaje!.id) { res.status(404).json({ error: 'Sesión no encontrada.' }); return; }
  if (s.estado !== 'MIDIENDO') { res.status(409).json({ error: 'La sesión no está activa.' }); return; }
  const validacion = validarSignos(req.body);
  if (!validacion.ok || validacion.signos.frecuenciaCardiaca == null || validacion.signos.spo2 == null || validacion.signos.temperatura == null) {
    res.status(422).json({ error: validacion.ok ? 'Faltan FC, SpO2 o temperatura.' : validacion.errores.join(' ') }); return;
  }
  const signos = validacion.signos;
  const calidad = Math.max(0, Math.min(100, Number(req.body.calidad) || 0));
  if (calidad < 60) { res.status(422).json({ error: 'Calidad de señal menor a 60%. Reposicione el sensor y repita la medición.' }); return; }
  const news = calcularNews2(signos, s.edadPaciente);
  const muestras = Array.isArray(req.body.muestras) ? req.body.muestras.slice(-60) : [];
  await prisma.$transaction([
    prisma.sesionMedicion.update({ where: { id: s.id }, data: {
      estado: 'COMPLETADA', fase: 'COMPLETADA', progreso: 100, finalizadaEn: new Date(),
      duracionSeg: Math.max(0, Number(req.body.duracionSeg) || 0), calidad,
      ...signos, news2: news.total, alertas: [], muestras: muestras as never,
    } }),
    prisma.dispositivo.update({ where: { id: s.dispositivoId }, data: { estado: 'LIBRE' } }),
  ]);
  res.json({ ok: true });
};

export const errorMicrotriaje = async (req: DeviceRequest, res: Response) => {
  const s = await prisma.sesionMedicion.findUnique({ where: { id: String(req.params.id) } });
  if (!s || s.dispositivoId !== req.microtriaje!.id) { res.status(404).json({ error: 'Sesión no encontrada.' }); return; }
  await prisma.$transaction([
    prisma.sesionMedicion.update({ where: { id: s.id }, data: { estado: 'ERROR', mensajeError: String(req.body.mensaje ?? req.body.codigo ?? 'Error del sensor'), finalizadaEn: new Date() } }),
    prisma.dispositivo.update({ where: { id: s.dispositivoId }, data: { estado: 'LIBRE' } }),
  ]);
  res.json({ ok: true });
};

/** Expira reservas y lecturas que dejaron de ser válidas; se ejecuta periódicamente. */
export const limpiarSesionesObsoletas = async () => {
  const ahora = Date.now();
  const esperaLimite = new Date(ahora - 3 * 60_000);
  const medicionLimite = new Date(ahora - 3 * 60_000);
  const lecturaLimite = new Date(ahora - 15 * 60_000);
  await prisma.dispositivo.updateMany({
    where: { estado: { not: 'OFFLINE' }, OR: [{ ultimoLatido: null }, { ultimoLatido: { lt: new Date(ahora - 30_000) } }] },
    data: { estado: 'OFFLINE' },
  });
  const obsoletas = await prisma.sesionMedicion.findMany({
    where: { OR: [
      { estado: 'ESPERANDO_PACIENTE', creadaEn: { lt: esperaLimite } },
      { estado: 'MIDIENDO', iniciadaEn: { lt: medicionLimite } },
      { estado: 'COMPLETADA', finalizadaEn: { lt: lecturaLimite }, triaje: null },
    ] }, select: { id: true, dispositivoId: true },
  });
  for (const sesion of obsoletas) {
    await prisma.$transaction([
      prisma.sesionMedicion.updateMany({ where: { id: sesion.id, estado: { in: ['ESPERANDO_PACIENTE', 'MIDIENDO', 'COMPLETADA'] } }, data: { estado: 'EXPIRADA', finalizadaEn: new Date() } }),
      prisma.dispositivo.updateMany({ where: { id: sesion.dispositivoId, estado: { not: 'OFFLINE' } }, data: { estado: 'LIBRE' } }),
    ]);
  }
};
