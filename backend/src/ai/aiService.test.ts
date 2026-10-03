import test from "node:test";
import assert from "node:assert/strict";
import { AiService, ErrorIA, normalizarErrorProveedor, parsearRespuestaIA, validarSintomas } from "./aiService.js";

test("acepta una entrada clínica normal", () => {
  assert.equal(validarSintomas("  fiebre y tos  "), "fiebre y tos");
});

test("rechaza una entrada vacía", () => {
  assert.throws(() => validarSintomas("   "), (error: ErrorIA) => error.codigo === "ENTRADA");
});

test("rechaza una entrada demasiado extensa", () => {
  assert.throws(() => validarSintomas("a".repeat(3001)), (error: ErrorIA) => error.codigo === "ENTRADA");
});

test("procesa JSON válido aunque esté delimitado como bloque", () => {
  const respuesta = parsearRespuestaIA('```json\n{"urgencia":"BAJA","especialidad":"Medicina General","recomendacion":"Solicitar cita."}\n```');
  assert.equal(respuesta.urgencia, "BAJA");
});

test("recupera JSON rodeado de texto y normaliza la urgencia", () => {
  const respuesta = parsearRespuestaIA('Resultado: {"urgencia":"baja","especialidad":"Medicina General","recomendacion":"Solicitar cita."} Fin.');
  assert.equal(respuesta.urgencia, "BAJA");
});

test("rechaza una respuesta vacía", () => {
  assert.throws(() => parsearRespuestaIA(""), (error: ErrorIA) => error.codigo === "RESPUESTA_INVALIDA");
});

test("rechaza JSON con urgencia inesperada", () => {
  assert.throws(() => parsearRespuestaIA('{"urgencia":"CRITICA","especialidad":"X","recomendacion":"Y"}'), (error: ErrorIA) => error.codigo === "RESPUESTA_INVALIDA");
});

test("clasifica errores de cuota sin exponer el mensaje original", () => {
  const error = normalizarErrorProveedor(new Error("429 quota exceeded secret detail"));
  assert.equal(error.codigo, "CUOTA");
  assert.doesNotMatch(error.message, /secret detail/);
});

test("falla de forma comprensible cuando falta la API key", async () => {
  const servicio = new AiService("");
  await assert.rejects(() => servicio.evaluar("dolor leve"), (error: ErrorIA) => error.codigo === "CONFIGURACION");
});

test("prioriza el error de entrada aunque falte la API key", async () => {
  const servicio = new AiService("");
  await assert.rejects(() => servicio.evaluar("   "), (error: ErrorIA) => error.codigo === "ENTRADA");
});

test("reintenta errores transitorios y usa el modelo de respaldo", async () => {
  const intentos: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchSimulado: typeof fetch = async (entrada, init) => {
    intentos.push({
      url: String(entrada),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    });
    if (intentos.length < 4) {
      return new Response(JSON.stringify({ error: { status: "UNAVAILABLE" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"urgencia":"NULA","especialidad":"No aplica","recomendacion":"Sin síntomas."}' }] }, finishReason: "STOP" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const esperaAnterior = process.env.AI_RETRY_BASE_MS;
  process.env.AI_RETRY_BASE_MS = "50";
  try {
    const servicio = new AiService("clave-de-prueba", "gemini-3.8-flash", 10000, fetchSimulado);
    const respuesta = await servicio.evaluar("texto de prueba", "zero-shot");
    assert.equal(respuesta.urgencia, "NULA");
    assert.equal(intentos.length, 4);
    assert.match(intentos[3]!.url, /gemini-2\.5-flash/);
    const configuracion = intentos[0]!.body.generationConfig as Record<string, unknown>;
    assert.equal(configuracion.responseMimeType, "application/json");
    assert.ok(configuracion.responseJsonSchema);
  } finally {
    if (esperaAnterior === undefined) delete process.env.AI_RETRY_BASE_MS;
    else process.env.AI_RETRY_BASE_MS = esperaAnterior;
  }
});
