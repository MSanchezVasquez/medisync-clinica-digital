import { type Request, type Response } from 'express';
import { AiService, ErrorIA } from '../ai/aiService.js';
import { listarPrompts } from '../ai/promptLibrary.js';
import { TECNICAS_PROMPT, type TecnicaPrompt } from '../ai/types.js';
import { prisma } from '../lib/prisma.js';
import { calcularNews2, combinarUrgencia } from '../services/news2.js';

const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
const aiService = new AiService(apiKey);

export const estadoIa = async (_req: Request, res: Response): Promise<void> => {
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
};

export const obtenerPrompts = (_req: Request, res: Response): void => {
  res.json(listarPrompts());
};

export const evaluarIa = async (req: Request, res: Response): Promise<void> => {
  const tecnicaSolicitada = req.body.tecnica ?? 'few-shot';
  if (!TECNICAS_PROMPT.includes(tecnicaSolicitada)) {
    res
      .status(400)
      .json({ error: 'La técnica debe ser zero-shot, one-shot o few-shot.' });
    return;
  }
  try {
    const tecnica = tecnicaSolicitada as TecnicaPrompt;
    let vitales: Record<string, number> | null = null;
    let news2 = null;
    if (req.body.sesionMedicionId) {
      const sesion = await prisma.sesionMedicion.findUnique({ where: { id: String(req.body.sesionMedicionId) } });
      if (!sesion || sesion.estado !== 'COMPLETADA' || !sesion.finalizadaEn || Date.now() - sesion.finalizadaEn.getTime() > 15 * 60_000) {
        res.status(409).json({ error: 'La medición no está disponible o venció. Repita la medición.' });
        return;
      }
      if (sesion.iniciadaPorId !== req.usuario?.id && req.usuario?.rol !== 'ADMIN') {
        res.status(403).json({ error: 'No tiene acceso a esta medición.' });
        return;
      }
      vitales = Object.fromEntries(Object.entries({ frecuenciaCardiaca: sesion.frecuenciaCardiaca, spo2: sesion.spo2, temperatura: sesion.temperatura, presionSistolica: sesion.presionSistolica, presionDiastolica: sesion.presionDiastolica, frecuenciaRespiratoria: sesion.frecuenciaRespiratoria }).filter(([, v]) => v != null)) as Record<string, number>;
      news2 = calcularNews2(vitales, Number(req.body.edad) || sesion.edadPaciente);
    }
    const textoIa = vitales ? `${req.body.sintomas}\n\nSignos vitales medidos por equipo: ${Object.entries(vitales).map(([k, v]) => `${k} ${v}`).join('; ')}. Considera estos datos en la recomendación y prioriza evaluación profesional ante alteraciones.` : req.body.sintomas;
    const respuesta = await aiService.evaluar(textoIa, tecnica);
    const combinada = news2 ? combinarUrgencia(respuesta.urgencia, news2.urgenciaMinima) : { urgencia: respuesta.urgencia, escalada: false };
    res.json({
      ...respuesta,
      urgencia: combinada.urgencia,
      urgenciaIA: respuesta.urgencia,
      escaladaPorSignos: combinada.escalada,
      news2,
      recomendacion: combinada.escalada ? `Los signos vitales requieren priorización (NEWS2 ${news2?.total}). ${respuesta.recomendacion}` : respuesta.recomendacion,
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
};
