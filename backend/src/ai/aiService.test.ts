import test from "node:test";
import assert from "node:assert/strict";
import { AiService, ErrorIA, normalizarErrorProveedor, parsearRespuestaIA, validarSintomas } from "./aiService.js";
import { consultarPacientePractica, evaluarCasoPractica } from './practicaTriaje.js';

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

test('envía los síntomas escritos y las mediciones del perfil ficticio al evaluador', async () => {
  const sintomas = 'Dolor de cabeza durante la tarde';
  const resultado = await evaluarCasoPractica({
    evaluar: async (entrada, tecnica, mediciones) => {
      assert.equal(entrada, sintomas);
      assert.equal(tecnica, 'few-shot');
      assert.match(mediciones ?? '', /Edad: 28 años/);
      assert.match(mediciones ?? '', /Talla: 168 cm/);
      assert.match(mediciones ?? '', /SpO₂: 99 %/);
      assert.doesNotMatch(mediciones ?? '', /00000002|Paciente de práctica/);
      return { urgencia: 'MEDIA', especialidad: 'Ejemplo', recomendacion: 'Resultado de prueba.' };
    },
  }, '00000002', sintomas);
  assert.equal(resultado.origen, 'gemini');
  assert.equal(resultado.urgencia, 'MEDIA');
});

test('sin Gemini solo evalúa los síntomas de ejemplo del propio paciente', async () => {
  const servicio = new AiService('');
  const paciente = consultarPacientePractica('00000001');
  const resultado = await evaluarCasoPractica(servicio, paciente.dni, paciente.sintomasEjemplo);
  assert.equal(resultado.origen, 'ejemplo');
  await assert.rejects(
    () => evaluarCasoPractica(servicio, paciente.dni, 'Un síntoma diferente.'),
    (error: ErrorIA) => error.codigo === 'CONFIGURACION'
  );
  assert.throws(() => consultarPacientePractica('99999999'), (error: ErrorIA) => error.status === 404);
});
