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
