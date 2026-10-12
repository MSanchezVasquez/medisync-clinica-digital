import 'dotenv/config';
import { verificarToken } from './middlewares/auth.middleware.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { AiService, ErrorIA } from './ai/aiService.js';
import { listarPrompts } from './ai/promptLibrary.js';
import { TECNICAS_PROMPT, type TecnicaPrompt } from './ai/types.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
console.log(`Estado de API Key: ${apiKey ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
const aiService = new AiService(apiKey);
const dataDirectory = new URL('../data/', import.meta.url);
const triajesFile = new URL('triajes.json', dataDirectory);

type UrgenciaGuardable = 'ALTA' | 'MEDIA' | 'BAJA';
type TriajeGuardado = {
  id: string;
  nombreCompleto: string;
  dni: string;
  edad: number;
  peso: number;
  altura: number;
  sintomas: string;
  urgencia: UrgenciaGuardable;
  especialidad: string;
  recomendacion: string;
  creadoEn: string;
};

const datosTriajeValidos = (datos: Record<string, unknown>): boolean =>
  typeof datos.nombreCompleto === 'string' &&
  datos.nombreCompleto.trim().length >= 3 &&
  typeof datos.dni === 'string' &&
  /^\d{8}$/.test(datos.dni) &&
  typeof datos.edad === 'number' &&
  datos.edad >= 0 &&
  datos.edad <= 120 &&
  typeof datos.peso === 'number' &&
  datos.peso > 0 &&
  typeof datos.altura === 'number' &&
  datos.altura > 0 &&
  typeof datos.sintomas === 'string' &&
  datos.sintomas.trim().length > 0 &&
  typeof datos.urgencia === 'string' &&
  ['ALTA', 'MEDIA', 'BAJA'].includes(datos.urgencia) &&
  typeof datos.especialidad === 'string' &&
  typeof datos.recomendacion === 'string';

const leerTriajes = async (): Promise<TriajeGuardado[]> => {
  try {
    const guardados = JSON.parse(
      await readFile(triajesFile, 'utf8'),
    ) as Partial<TriajeGuardado>[];
    return guardados.map((t) => ({
      ...t,
      id: t.id ?? crypto.randomUUID(),
      nombreCompleto: t.nombreCompleto ?? 'Paciente sin registrar',
      dni: t.dni ?? '',
      edad: t.edad ?? 0,
      peso: t.peso ?? 0,
      altura: t.altura ?? 0,
      sintomas: t.sintomas ?? '',
      urgencia: t.urgencia ?? 'BAJA',
      especialidad: t.especialidad ?? 'Sin registrar',
      recomendacion: t.recomendacion ?? 'Sin registrar',
      creadoEn: t.creadoEn ?? new Date().toISOString(),
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};

const guardarTriajes = async (triajes: TriajeGuardado[]): Promise<void> => {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(triajesFile, JSON.stringify(triajes, null, 2), 'utf8');
};

const limpiarHtml = (valor: string): string =>
  valor
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const requerirRol = (rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = (req as any).usuario;
    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      res
        .status(403)
        .json({
          error: 'Acceso denegado: permisos insuficientes para esta operación.',
        });
      return;
    }
    next();
  };
};

// POST /api/auth/login - Autenticación con credenciales institucionales
app.post(
  '/api/auth/login',
  async (req: Request, res: Response): Promise<void> => {
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

      const jwtSecret =
        process.env.JWT_SECRET || 'medisync_fallback_secret_key';
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
  },
);

// GET /api/auth/me - Obtener perfil del usuario autenticado
app.get(
  '/api/auth/me',
  verificarToken,
  async (req: Request, res: Response): Promise<void> => {
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
  },
);

app.post(
  '/api/consultar-dni',
  async (req: Request, res: Response): Promise<void> => {
    const dni = typeof req.body.dni === 'string' ? req.body.dni.trim() : '';
    if (!/^\d{8}$/.test(dni)) {
      res
        .status(400)
        .json({ error: 'El DNI debe contener exactamente 8 dígitos.' });
      return;
    }
    try {
      const url = 'https://eldni.com/pe/buscar-datos-por-dni';
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      };
      const inicial = await fetch(url, { headers });
      if (!inicial.ok) {
        res.status(502).json({
          error: 'No se pudo iniciar una sesión con el servicio de DNI.',
        });
        return;
      }
      const formularioHtml = await inicial.text();
      const token = formularioHtml.match(
        /name=["']_token["'][^>]*value=["']([^"']+)["']/i,
      )?.[1];
      const cookies = inicial.headers
        .getSetCookie()
        .map((c) => c.split(';', 1)[0])
        .filter(Boolean)
        .join('; ');
      if (!token || !cookies) {
        res.status(502).json({
          error: 'El servicio de DNI no entregó un token o una sesión válidos.',
        });
        return;
      }
      const formulario = new FormData();
      formulario.append('dni', dni);
      formulario.append('_token', token);
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { ...headers, Referer: url, Cookie: cookies },
        body: formulario,
      });
      if (!respuesta.ok) {
        res.status(502).json({
          error: 'El servicio externo de DNI no respondió correctamente.',
        });
        return;
      }
      const html = await respuesta.text();
      let nombreCompleto = '';
      for (const fila of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const columnas = [
          ...fila[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
        ].map((c) => limpiarHtml(c[1] ?? ''));
        if (columnas.length >= 4 && columnas[0] === dni) {
          nombreCompleto = [columnas[1], columnas[2], columnas[3]]
            .filter(Boolean)
            .join(' ');
          break;
        }
      }
      if (!nombreCompleto) {
        res
          .status(404)
          .json({ error: 'No se encontraron datos para el DNI ingresado.' });
        return;
      }
      res.json({ nombreCompleto });
    } catch (error) {
      console.error('Error al consultar el DNI:', error);
      res
        .status(502)
        .json({ error: 'No se pudo consultar el servicio externo de DNI.' });
    }
  },
);

app.get(
  '/api/estado-ia',
  async (_req: Request, res: Response): Promise<void> => {
    if (!apiKey) {
      res.status(503).json({ activo: false });
      return;
    }
    try {
      const respuesta = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models',
        {
          headers: { 'x-goog-api-key': apiKey },
        },
      );
      res.status(respuesta.ok ? 200 : 503).json({ activo: respuesta.ok });
    } catch {
      res.status(503).json({ activo: false });
    }
  },
);

app.get('/api/ia/prompts', (_req: Request, res: Response): void => {
  res.json(listarPrompts());
});

app.get(
  '/api/dashboard',
  verificarToken,
  async (_req: Request, res: Response): Promise<void> => {
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
  },
);

app.get(
  '/api/triajes',
  verificarToken,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const triajes = await prisma.triaje.findMany({
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
  },
);

app.get(
  '/api/triajes/:id',
  verificarToken,
  async (req: Request, res: Response): Promise<void> => {
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
  },
);

app.post('/api/triajes', verificarToken, async (req: Request, res: Response): Promise<void> => {
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
    } = req.body;

    if (!sintomas || !urgencia || !especialidad || !recomendacion) {
      res
        .status(400)
        .json({ error: 'Los datos clínicos diagnósticos son requeridos.' });
      return;
    }

    const nuevoTriaje = await prisma.triaje.create({
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
        medicoId: usuario?.id || null, // Asocia automáticamente al médico logueado
      },
      include: {
        medico: {
          select: {
            id: true,
            nombre: true,
            cmp: true,
          },
        },
      },
    });

    res.status(201).json(nuevoTriaje);
  } catch (error) {
    console.error('Error al crear triaje:', error);
    res.status(500).json({ error: 'Error interno al registrar el triaje.' });
  }
});

// PUT /api/triajes/:id - Actualizar triaje existente
app.put("/api/triajes/:id", verificarToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id); // Forzar a string para satisfacer a Prisma
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
      res.status(404).json({ error: "El triaje solicitado no existe." });
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
        especialidad: especialidad ? String(especialidad).trim() : existe.especialidad,
        recomendacion: recomendacion ? String(recomendacion).trim() : existe.recomendacion,
      },
    });

    res.json(triajeActualizado);
  } catch (error) {
    console.error("❌ Error al actualizar triaje:", error);
    res.status(500).json({ error: "Error interno al actualizar el triaje." });
  }
});

app.delete(
  '/api/triajes/:id',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const triajes = await leerTriajes();
      const restantes = triajes.filter((t) => t.id !== req.params.id);
      if (restantes.length === triajes.length) {
        res.status(404).json({ error: 'Triaje no encontrado.' });
        return;
      }
      await guardarTriajes(restantes);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: 'No se pudo eliminar el triaje.' });
    }
  },
);

app.post('/api/triaje', async (req: Request, res: Response): Promise<void> => {
  const tecnicaSolicitada = req.body.tecnica ?? 'few-shot';
  if (!TECNICAS_PROMPT.includes(tecnicaSolicitada)) {
    res
      .status(400)
      .json({ error: 'La técnica debe ser zero-shot, one-shot o few-shot.' });
    return;
  }
  try {
    const tecnica = tecnicaSolicitada as TecnicaPrompt;
    const respuesta = await aiService.evaluar(req.body.sintomas, tecnica);
    res.json({
      ...respuesta,
      tecnica,
      promptId: listarPrompts().find((prompt) => prompt.tecnica === tecnica)
        ?.id,
    });
  } catch (error) {
    const errorSeguro =
      error instanceof ErrorIA
        ? error
        : new ErrorIA('CONEXION', 500, 'No se pudo procesar el pre-triaje.');
    console.error(`Error IA [${errorSeguro.codigo}]: ${errorSeguro.message}`);
    res
      .status(errorSeguro.status)
      .json({ error: errorSeguro.message, codigo: errorSeguro.codigo });
  }
});

// Endpoint Webhook para escuchar eventos de WAHA
app.post('/api/webhook/whatsapp', async (req, res) => {
  res.status(200).send('Webhook recibido');

  const body = req.body;

  if (body?.event === 'message' && !body?.payload?.fromMe) {
    const telefonoPaciente = body.payload.from;

    if (
      telefonoPaciente.includes('@g.us') ||
      telefonoPaciente.includes('@broadcast')
    ) {
      return;
    }
    const mensajeTexto = body.payload.body?.toLowerCase() || '';

    const palabrasClaveSalud = [
      'dolor',
      'fiebre',
      'síntoma',
      'sintoma',
      'urgencia',
      'triaje',
      'clínica',
      'clinica',
      'doctor',
      'emergencia',
    ];

    const esMensajeMedico = palabrasClaveSalud.some((palabra) =>
      mensajeTexto.includes(palabra),
    );

    if (esMensajeMedico) {
      try {
        console.log('Evaluando síntomas con Gemini AI...');

        const resultadoIA = await aiService.evaluar(mensajeTexto, 'few-shot');
        console.log(
          `✅ Evaluación lista -> Urgencia: ${resultadoIA.urgencia} | Especialidad: ${resultadoIA.especialidad}`,
        );

        // 3. NUEVO: Guardamos el diagnóstico de WhatsApp directo en PostgreSQL
        console.log('💾 Guardando resultado en PostgreSQL...');
        const triajeGuardado = await prisma.triaje.create({
          data: {
            telefono: telefonoPaciente,
            sintomas: mensajeTexto,
            urgencia: resultadoIA.urgencia,
            especialidad: resultadoIA.especialidad,
            recomendacion: resultadoIA.recomendacion,
          },
        });
        console.log(`✅ Registro exitoso en BD. ID: ${triajeGuardado.id}`);

        const mensajeRespuesta = `🏥 *MediSync Perú - Pre-Triaje Automático*\n\nHemos analizado tus síntomas:\n\n🚨 *Nivel de Urgencia:* ${resultadoIA.urgencia}\n👨‍⚕️ *Especialidad Sugerida:* ${resultadoIA.especialidad}\n📋 *Recomendación:* ${resultadoIA.recomendacion}\n\n_Por favor, acércate a recepción con este mensaje. Ticket: ${triajeGuardado.id.split('-')[0]}_`;

        await fetch('http://127.0.0.1:3005/api/sendText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': 'MediSync_SecretKey_2026',
          },
          body: JSON.stringify({
            session: 'bot-medisync',
            chatId: telefonoPaciente,
            text: mensajeRespuesta,
          }),
        });

        console.log(
          '💬 Respuesta enviada exitosamente por WhatsApp al paciente.',
        );
      } catch (error) {
        console.error('❌ Error en el flujo de IA o WhatsApp:', error);
      }
    } else {
      console.log(
        `Mensaje ignorado (no médico): "${mensajeTexto}" de ${telefonoPaciente}`,
      );
    }
  }
});

// POST /api/usuarios - Registrar nuevo médico/personal (Solo ADMIN)
app.post(
  "/api/usuarios",
  verificarToken,
  requerirRol(["ADMIN"]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, nombre, cmp, rol } = req.body;

      if (!email || !password || !nombre) {
        res.status(400).json({ error: "Email, contraseña y nombre son campos obligatorios." });
        return;
      }

      // Verificar si el correo ya existe
      const existe = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existe) {
        res.status(409).json({ error: "El correo electrónico ya se encuentra registrado." });
        return;
      }

      // Hashear credencial de acceso
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const nuevoUsuario = await prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: passwordHash,
          nombre: nombre.trim(),
          cmp: cmp ? cmp.trim() : null,
          rol: rol === "ADMIN" ? "ADMIN" : "MEDICO",
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
        mensaje: "Personal médico registrado exitosamente.",
        usuario: nuevoUsuario,
      });
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      res.status(500).json({ error: "Error interno al crear el usuario." });
    }
  }
);

// GET /api/usuarios - Listar todo el personal asistencial y administrativo (Solo ADMIN)
app.get(
  "/api/usuarios",
  verificarToken,
  requerirRol(["ADMIN"]),
  async (_req: Request, res: Response): Promise<void> => {
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
        orderBy: { creadoEn: "desc" },
      });

      res.json(usuarios);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ error: "Error interno al listar los usuarios." });
    }
  }
);

// PATCH /api/usuarios/:id/estado - Activar o suspender acceso de un usuario (Solo ADMIN)
app.patch(
  "/api/usuarios/:id/estado",
  verificarToken,
  requerirRol(["ADMIN"]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id);
      const usuarioSolicitante = (req as any).usuario;

      // Evitar que el admin se desactive a sí mismo por accidente
      if (usuarioSolicitante.id === id) {
        res.status(400).json({ error: "No puede desactivar su propia cuenta de administrador." });
        return;
      }

      const usuarioExistente = await prisma.user.findUnique({ where: { id } });
      if (!usuarioExistente) {
        res.status(404).json({ error: "El usuario especificado no existe." });
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
        mensaje: `Usuario ${usuarioActualizado.activo ? "activado" : "suspendido"} exitosamente.`,
        usuario: usuarioActualizado,
      });
    } catch (error) {
      console.error("Error al cambiar estado del usuario:", error);
      res.status(500).json({ error: "Error interno al actualizar estado del usuario." });
    }
  }
);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(
    `Servidor Backend de MediSync corriendo en http://localhost:${PORT} y expuesto a la red local.`,
  );
});
