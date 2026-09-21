import { GoogleGenerativeAI } from "@google/generative-ai";
import { obtenerPrompt } from "./promptLibrary.js";
import type { DiagnosticoIA, TecnicaPrompt, Urgencia } from "./types.js";

const URGENCIAS: Urgencia[] = ["ALTA", "MEDIA", "BAJA", "NULA"];
const MAX_SINTOMAS = 3000;

export class ErrorIA extends Error {
  constructor(
    public readonly codigo: "CONFIGURACION" | "ENTRADA" | "TIMEOUT" | "CUOTA" | "AUTENTICACION" | "RESPUESTA_INVALIDA" | "CONEXION",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ErrorIA";
  }
}

export const validarSintomas = (valor: unknown): string => {
  if (typeof valor !== "string" || !valor.trim()) throw new ErrorIA("ENTRADA", 400, "Ingrese una descripción de síntomas.");
  const sintomas = valor.trim();
  if (sintomas.length > MAX_SINTOMAS) throw new ErrorIA("ENTRADA", 400, `La descripción no debe superar ${MAX_SINTOMAS} caracteres.`);
  return sintomas;
};

export const parsearRespuestaIA = (texto: string): DiagnosticoIA => {
  if (!texto.trim()) throw new ErrorIA("RESPUESTA_INVALIDA", 502, "El modelo devolvió una respuesta vacía.");
  let datos: unknown;
  try {
    datos = JSON.parse(texto.replace(/```json/gi, "").replace(/```/g, "").trim());
  } catch {
    throw new ErrorIA("RESPUESTA_INVALIDA", 502, "El modelo devolvió un formato inesperado.");
  }
  const candidato = datos as Partial<DiagnosticoIA>;
  if (!URGENCIAS.includes(candidato.urgencia as Urgencia) || typeof candidato.especialidad !== "string" || !candidato.especialidad.trim() || typeof candidato.recomendacion !== "string" || !candidato.recomendacion.trim()) {
    throw new ErrorIA("RESPUESTA_INVALIDA", 502, "La respuesta del modelo no contiene todos los campos esperados.");
  }
  return { urgencia: candidato.urgencia as Urgencia, especialidad: candidato.especialidad.trim(), recomendacion: candidato.recomendacion.trim() };
};

export const normalizarErrorProveedor = (error: unknown): ErrorIA => {
  if (error instanceof ErrorIA) return error;
  const mensaje = error instanceof Error ? error.message.toLowerCase() : "";
  if (mensaje.includes("429") || mensaje.includes("quota") || mensaje.includes("rate limit")) return new ErrorIA("CUOTA", 429, "El servicio de IA alcanzó temporalmente su límite de solicitudes.");
  if (mensaje.includes("401") || mensaje.includes("403") || mensaje.includes("api key") || mensaje.includes("permission")) return new ErrorIA("AUTENTICACION", 503, "La configuración de acceso al servicio de IA no es válida.");
  return new ErrorIA("CONEXION", 502, "No fue posible comunicarse con el servicio de IA.");
};

export class AiService {
  private readonly cliente: GoogleGenerativeAI;

  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
    private readonly timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000),
  ) {
    this.cliente = new GoogleGenerativeAI(apiKey);
  }

  async evaluar(sintomasEntrada: unknown, tecnica: TecnicaPrompt = "few-shot"): Promise<DiagnosticoIA> {
    const sintomas = validarSintomas(sintomasEntrada);
    if (!this.apiKey) throw new ErrorIA("CONFIGURACION", 503, "El servidor no tiene configurada la API key de Gemini.");
    const prompt = obtenerPrompt(tecnica).construir(sintomas);
    const modelo = this.cliente.getGenerativeModel({ model: this.modelo });
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try {
      const resultado = await Promise.race([
        modelo.generateContent(prompt),
        new Promise<never>((_resolve, reject) => {
          temporizador = setTimeout(() => reject(new ErrorIA("TIMEOUT", 504, "El servicio de IA tardó demasiado en responder.")), this.timeoutMs);
        }),
      ]);
      return parsearRespuestaIA(resultado.response.text());
    } catch (error) {
      throw normalizarErrorProveedor(error);
    } finally {
      if (temporizador) clearTimeout(temporizador);
    }
  }
}
