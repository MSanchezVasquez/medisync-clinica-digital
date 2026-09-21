import test from "node:test";
import assert from "node:assert/strict";
import { listarTriajes } from "./repository.js";

test("consulta Supabase con la clave secreta solo en apikey y adapta los campos", async () => {
  const urlAnterior = process.env.SUPABASE_URL;
  const claveAnterior = process.env.SUPABASE_SECRET_KEY;
  const claveLegacyAnterior = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fetchAnterior = globalThis.fetch;

  process.env.SUPABASE_URL = "https://proyecto.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_prueba";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  globalThis.fetch = async (entrada, init) => {
    assert.equal(String(entrada), "https://proyecto.supabase.co/rest/v1/triajes?select=*&order=creado_en.desc");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("apikey"), "sb_secret_prueba");
    assert.equal(headers.get("authorization"), null);
    return new Response(JSON.stringify([{
      id: "00000000-0000-4000-8000-000000000001",
      nombre_completo: "Paciente de prueba",
      dni: "12345678",
      edad: 30,
      peso: 70,
      altura: 170,
      sintomas: "Síntoma de prueba",
      urgencia: "BAJA",
      especialidad: "Medicina General",
      recomendacion: "Solicitar una consulta.",
      creado_en: "2026-09-21T12:00:00.000Z",
    }]), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const [triaje] = await listarTriajes();
    assert.equal(triaje?.nombreCompleto, "Paciente de prueba");
    assert.equal(triaje?.creadoEn, "2026-09-21T12:00:00.000Z");
  } finally {
    globalThis.fetch = fetchAnterior;
    if (urlAnterior === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = urlAnterior;
    if (claveAnterior === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = claveAnterior;
    if (claveLegacyAnterior === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = claveLegacyAnterior;
  }
});
