import { obtenerPrompt } from "./promptLibrary.js";
import type { DiagnosticoIA, TecnicaPrompt, Urgencia } from "./types.js";

const URGENCIAS: Urgencia[] = ["ALTA", "MEDIA", "BAJA", "NULA"];
const MAX_SINTOMAS = 3000;
const ESTADOS_TRANSITORIOS = new Set([408, 425, 429, 500, 502, 503, 504]);

type RespuestaGemini = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

class ErrorProveedorGemini extends Error {
  constructor(
    public readonly statusHttp: number,
    public readonly estadoProveedor: string,
    public readonly reintentable: boolean,
    public readonly reintentarEnMs?: number,
  ) {
    super(`Gemini HTTP ${statusHttp} ${estadoProveedor}`.trim());
    this.name = "ErrorProveedorGemini";
  }
}

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

const numeroConfigurado = (valor: string | undefined, predeterminado: number, minimo: number, maximo: number): number => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.min(maximo, Math.max(minimo, Math.trunc(numero))) : predeterminado;
};

const esperar = (milisegundos: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milisegundos));

const leerRetryAfter = (valor: string | null): number | undefined => {
  if (!valor) return undefined;
  const segundos = Number(valor);
  if (Number.isFinite(segundos)) return Math.max(0, segundos * 1000);
  const fecha = Date.parse(valor);
  return Number.isNaN(fecha) ? undefined : Math.max(0, fecha - Date.now());
};

export const validarSintomas = (valor: unknown): string => {
  if (typeof valor !== "string" || !valor.trim()) throw new ErrorIA("ENTRADA", 400, "Ingrese una descripción de síntomas.");
  const sintomas = valor.trim();
  if (sintomas.length > MAX_SINTOMAS) throw new ErrorIA("ENTRADA", 400, `La descripción no debe superar ${MAX_SINTOMAS} caracteres.`);
  return sintomas;
};

export const parsearRespuestaIA = (texto: string): DiagnosticoIA => {
  if (!texto.trim()) throw new ErrorIA("RESPUESTA_INVALIDA", 503, "El modelo devolvió una respuesta vacía.");
  const limpio = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  const json = inicio >= 0 && fin > inicio ? limpio.slice(inicio, fin + 1) : limpio;
  let datos: unknown;
  try {
    datos = JSON.parse(json);
  } catch {
    throw new ErrorIA("RESPUESTA_INVALIDA", 503, "El modelo devolvió un formato inesperado.");
  }
  const candidato = datos as Partial<DiagnosticoIA>;
  const urgencia = typeof candidato.urgencia === "string" ? candidato.urgencia.trim().toUpperCase() as Urgencia : undefined;
  if (!urgencia || !URGENCIAS.includes(urgencia) || typeof candidato.especialidad !== "string" || !candidato.especialidad.trim() || typeof candidato.recomendacion !== "string" || !candidato.recomendacion.trim()) {
    throw new ErrorIA("RESPUESTA_INVALIDA", 503, "La respuesta del modelo no contiene todos los campos esperados.");
  }
  return { urgencia, especialidad: candidato.especialidad.trim(), recomendacion: candidato.recomendacion.trim() };
};

export const normalizarErrorProveedor = (error: unknown): ErrorIA => {
  if (error instanceof ErrorIA) return error;
  if (error instanceof ErrorProveedorGemini) {
    if (error.statusHttp === 429) return new ErrorIA("CUOTA", 429, "El servicio de IA está recibiendo demasiadas solicitudes. Espere unos segundos y vuelva a intentar.");
    if ([401, 403].includes(error.statusHttp)) return new ErrorIA("AUTENTICACION", 503, "La configuración de acceso al servicio de IA no es válida.");
    if ([400, 404].includes(error.statusHttp)) return new ErrorIA("CONFIGURACION", 503, "El modelo de IA configurado no está disponible para esta clave.");
    return new ErrorIA("CONEXION", 503, "El servicio de IA no está disponible temporalmente. Vuelva a intentar en unos segundos.");
  }
  const mensaje = error instanceof Error ? error.message.toLowerCase() : "";
  if (mensaje.includes("429") || mensaje.includes("quota") || mensaje.includes("rate limit")) return new ErrorIA("CUOTA", 429, "El servicio de IA está recibiendo demasiadas solicitudes. Espere unos segundos y vuelva a intentar.");
  if (mensaje.includes("401") || mensaje.includes("403") || mensaje.includes("api key") || mensaje.includes("permission")) return new ErrorIA("AUTENTICACION", 503, "La configuración de acceso al servicio de IA no es válida.");
  if (mensaje.includes("abort") || mensaje.includes("timeout")) return new ErrorIA("TIMEOUT", 504, "El servicio de IA tardó demasiado en responder.");
  return new ErrorIA("CONEXION", 503, "El servicio de IA no está disponible temporalmente. Vuelva a intentar en unos segundos.");
};

export class AiService {
  private readonly modelos: string[];
  private readonly timeoutTotalMs: number;
  private readonly timeoutIntentoMs: number;
  private readonly maxIntentos: number;
  private readonly esperaBaseMs: number;

  constructor(
    private readonly apiKey: string,
    modelo = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
    timeoutMs = Number(process.env.AI_TIMEOUT_MS || 45000),
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    const respaldo = (process.env.GEMINI_FALLBACK_MODELS || "gemini-2.5-flash")
      .split(",").map((item) => item.trim()).filter(Boolean);
    this.modelos = [...new Set([modelo, ...respaldo])];
    this.timeoutTotalMs = numeroConfigurado(String(timeoutMs), 45000, 5000, 120000);
    this.timeoutIntentoMs = numeroConfigurado(process.env.AI_ATTEMPT_TIMEOUT_MS, 15000, 3000, 60000);
    this.maxIntentos = numeroConfigurado(process.env.AI_MAX_ATTEMPTS, 4, 1, 6);
    this.esperaBaseMs = numeroConfigurado(process.env.AI_RETRY_BASE_MS, 800, 50, 5000);
  }

  private modeloParaIntento(intento: number): string {
    if (this.modelos.length === 1 || intento < this.maxIntentos - 1) return this.modelos[0]!;
    return this.modelos[Math.min(intento - this.maxIntentos + 2, this.modelos.length - 1)]!;
  }

  private async solicitar(modelo: string, prompt: string, timeoutMs: number): Promise<string> {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      const respuesta = await this.fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              additionalProperties: false,
              properties: {
                urgencia: { type: "string", enum: URGENCIAS },
                especialidad: { type: "string" },
                recomendacion: { type: "string" },
              },
              required: ["urgencia", "especialidad", "recomendacion"],
            },
            candidateCount: 1,
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
        signal: controlador.signal,
      });
      const datos = await respuesta.json().catch(() => ({})) as RespuestaGemini;
      if (!respuesta.ok) {
        throw new ErrorProveedorGemini(
          respuesta.status,
          datos.error?.status || "ERROR_PROVEEDOR",
          ESTADOS_TRANSITORIOS.has(respuesta.status),
          leerRetryAfter(respuesta.headers.get("retry-after")),
        );
      }

      const candidato = datos.candidates?.[0];
      const texto = candidato?.content?.parts?.map((parte) => parte.text ?? "").join("") ?? "";
      const bloqueo = datos.promptFeedback?.blockReason || candidato?.finishReason;
      if (!texto && bloqueo && !["STOP", "MAX_TOKENS"].includes(bloqueo)) {
        throw new ErrorIA("RESPUESTA_INVALIDA", 422, "La IA no pudo evaluar ese contenido. Reformule los síntomas sin incluir datos personales adicionales.");
      }
      return texto;
    } finally {
      clearTimeout(temporizador);
    }
  }

  async evaluar(sintomasEntrada: unknown, tecnica: TecnicaPrompt = "few-shot"): Promise<DiagnosticoIA> {
    const sintomas = validarSintomas(sintomasEntrada);
    if (!this.apiKey) throw new ErrorIA("CONFIGURACION", 503, "El servidor no tiene configurada la API key de Gemini.");
    const prompt = obtenerPrompt(tecnica).construir(sintomas);
    const limite = Date.now() + this.timeoutTotalMs;
    let ultimoError: ErrorIA = new ErrorIA("CONEXION", 503, "El servicio de IA no está disponible temporalmente.");

    for (let intento = 0; intento < this.maxIntentos; intento += 1) {
      const restante = limite - Date.now();
      if (restante <= 0) throw new ErrorIA("TIMEOUT", 504, "El servicio de IA tardó demasiado en responder.");
      try {
        const texto = await this.solicitar(this.modeloParaIntento(intento), prompt, Math.min(this.timeoutIntentoMs, restante));
        return parsearRespuestaIA(texto);
      } catch (error) {
        const esAbortado = error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name);
        const proveedor = error instanceof ErrorProveedorGemini ? error : undefined;
        ultimoError = esAbortado
          ? new ErrorIA("TIMEOUT", 504, "El servicio de IA tardó demasiado en responder.")
          : normalizarErrorProveedor(error);

        const respuestaInvalida = ultimoError.codigo === "RESPUESTA_INVALIDA" && ultimoError.status >= 500;
        const errorDeRed = error instanceof TypeError;
        const modeloNoDisponible = proveedor?.statusHttp === 404 && this.modelos.length > 1;
        const reintentable = esAbortado || errorDeRed || respuestaInvalida || modeloNoDisponible || proveedor?.reintentable === true;
        if (!reintentable || intento === this.maxIntentos - 1) throw ultimoError;

        console.warn(`Reintento IA ${intento + 1}/${this.maxIntentos}; modelo=${this.modeloParaIntento(intento)}; codigo=${ultimoError.codigo}`);

        const exponencial = this.esperaBaseMs * 2 ** intento;
        const jitter = Math.floor(Math.random() * Math.max(1, this.esperaBaseMs / 2));
        const espera = Math.min(proveedor?.reintentarEnMs ?? exponencial + jitter, 8000, Math.max(0, limite - Date.now()));
        if (espera > 0) await esperar(espera);
      }
    }

    throw ultimoError;
  }
}
