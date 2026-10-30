import { type Request, type Response } from 'express';
import { AiService, ErrorIA } from '../ai/aiService.js';
import { listarPrompts } from '../ai/promptLibrary.js';
import { TECNICAS_PROMPT, type TecnicaPrompt } from '../ai/types.js';

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
};
