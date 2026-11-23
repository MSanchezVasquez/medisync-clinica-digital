import test from "node:test";
import assert from "node:assert/strict";
import { listarPrompts, obtenerPrompt } from "./promptLibrary.js";

test("la biblioteca expone tres técnicas documentadas", () => {
  const prompts = listarPrompts();
  assert.equal(prompts.length, 3);
  assert.deepEqual(prompts.map((prompt) => prompt.id), ["PROMPT-01", "PROMPT-02", "PROMPT-03"]);
});

test("Zero-Shot contiene estructura, delimitadores y ninguna salida de ejemplo", () => {
  const prompt = obtenerPrompt("zero-shot").construir("Dolor de cabeza leve");
  assert.match(prompt, /### ROL/);
  assert.match(prompt, /<sintomas>[\s\S]*Dolor de cabeza leve[\s\S]*<\/sintomas>/);
  assert.equal((prompt.match(/Salida:/g) || []).length, 0);
});

test("One-Shot contiene exactamente un ejemplo", () => {
  const prompt = obtenerPrompt("one-shot").construir("Dolor abdominal");
  assert.equal((prompt.match(/Salida:/g) || []).length, 1);
});

test("Few-Shot contiene varios ejemplos representativos", () => {
  const prompt = obtenerPrompt("few-shot").construir("Temperatura normal");
  assert.equal((prompt.match(/Salida:/g) || []).length, 3);
  assert.match(prompt, /"NULA"/);
  assert.match(prompt, /"ALTA"/);
});

test('el contexto de la práctica conserva las mediciones separadas de los síntomas', () => {
  const prompt = obtenerPrompt('few-shot').construir('Síntomas escritos', 'Edad: 35 años\nPulso: 82 bpm');
  assert.match(prompt, /<sintomas>\s*Síntomas escritos\s*<\/sintomas>/);
  assert.match(prompt, /<mediciones_simuladas>\s*Edad: 35 años\s*Pulso: 82 bpm\s*<\/mediciones_simuladas>/);
});
