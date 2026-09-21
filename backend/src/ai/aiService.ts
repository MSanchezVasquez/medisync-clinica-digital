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
  constructor(
    private readonly apiKey: string,
    private readonly modelo = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
    private readonly timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000),
  ) {}

  async evaluar(sintomasEntrada: unknown, tecnica: TecnicaPrompt = "few-shot"): Promise<DiagnosticoIA> {
    const sintomas = validarSintomas(sintomasEntrada);
    if (!this.apiKey) throw new ErrorIA("CONFIGURACION", 503, "El servidor no tiene configurada la API key de Gemini.");
    const prompt = obtenerPrompt(tecnica).construir(sintomas);
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), this.timeoutMs);
    try {
      for (let intento = 0; intento < 2; intento += 1) {
        const respuesta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.modelo)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
          signal: controlador.signal,
        });
        if (respuesta.ok) {
          const datos = await respuesta.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const texto = datos.candidates?.[0]?.content?.parts?.map((parte) => parte.text ?? "").join("") ?? "";
          return parsearRespuestaIA(texto);
        }
        if (intento === 0 && [429, 503].includes(respuesta.status)) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          continue;
        }
        throw new Error(`Gemini HTTP ${respuesta.status}`);
      }
      throw new Error("Gemini no respondió después del reintento");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new ErrorIA("TIMEOUT", 504, "El servicio de IA tardó demasiado en responder.");
      throw normalizarErrorProveedor(error);
    } finally {
      clearTimeout(temporizador);
    }
  }
}
