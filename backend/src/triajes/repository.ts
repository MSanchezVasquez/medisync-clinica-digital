import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { DatosTriaje, MetricasDashboard, TriajeGuardado } from "./types.js";

const dataDirectory = new URL("../../data/", import.meta.url);
const triajesFile = new URL("triajes.json", dataDirectory);

type TriajeSupabase = {
  id: string;
  nombre_completo: string;
  dni: string;
  edad: number;
  peso: number;
  altura: number;
  sintomas: string;
  urgencia: "ALTA" | "MEDIA" | "BAJA";
  especialidad: string;
  recomendacion: string;
  creado_en: string;
};

const obtenerClaveSupabase = (): string | undefined =>
  process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabaseSolicitado = (): boolean =>
  Boolean(process.env.SUPABASE_URL?.trim() || obtenerClaveSupabase());

const supabaseConfigurado = (): boolean =>
  Boolean(process.env.SUPABASE_URL?.trim() && obtenerClaveSupabase());

const usarSupabase = (): boolean => {
  if (!supabaseSolicitado()) return false;
  if (!supabaseConfigurado()) {
    throw new Error("La configuración de Supabase está incompleta.");
  }
  return true;
};

const encabezadosSupabase = (): Record<string, string> => {
  const key = obtenerClaveSupabase();
  if (!key) throw new Error("SUPABASE_SECRET_KEY no está configurada.");
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };
  // Las claves service_role antiguas son JWT; las nuevas sb_secret_ van solo en apikey.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
};

const urlSupabase = (consulta = ""): string => {
  const base = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!base) throw new Error("SUPABASE_URL no está configurada.");
  return `${base}/rest/v1/triajes${consulta}`;
};

const peticionSupabase = async (consulta: string, init: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(init.headers);
  for (const [nombre, valor] of Object.entries(encabezadosSupabase())) headers.set(nombre, valor);
  const respuesta = await fetch(urlSupabase(consulta), {
    ...init,
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Supabase respondió ${respuesta.status}: ${detalle.slice(0, 300)}`);
  }
  return respuesta;
};

const desdeSupabase = (triaje: TriajeSupabase): TriajeGuardado => ({
  id: triaje.id,
  nombreCompleto: triaje.nombre_completo,
  dni: triaje.dni,
  edad: triaje.edad,
  peso: triaje.peso,
  altura: triaje.altura,
  sintomas: triaje.sintomas,
  urgencia: triaje.urgencia,
  especialidad: triaje.especialidad,
  recomendacion: triaje.recomendacion,
  creadoEn: triaje.creado_en,
});

const haciaSupabase = (datos: DatosTriaje): Omit<TriajeSupabase, "id" | "creado_en"> => ({
  nombre_completo: datos.nombreCompleto,
  dni: datos.dni,
  edad: datos.edad,
  peso: datos.peso,
  altura: datos.altura,
  sintomas: datos.sintomas,
  urgencia: datos.urgencia,
  especialidad: datos.especialidad,
  recomendacion: datos.recomendacion,
});

const normalizarTriajeLocal = (triaje: Partial<TriajeGuardado>): TriajeGuardado => ({
  id: triaje.id ?? crypto.randomUUID(),
  nombreCompleto: triaje.nombreCompleto ?? "Paciente sin registrar",
  dni: triaje.dni ?? "",
  edad: triaje.edad ?? 0,
  peso: triaje.peso ?? 0,
  altura: triaje.altura ?? 0,
  sintomas: triaje.sintomas ?? "",
  urgencia: triaje.urgencia ?? "BAJA",
  especialidad: triaje.especialidad ?? "Sin registrar",
  recomendacion: triaje.recomendacion ?? "Sin registrar",
  creadoEn: triaje.creadoEn ?? new Date().toISOString(),
});

const leerLocales = async (): Promise<TriajeGuardado[]> => {
  try {
    return (JSON.parse(await readFile(triajesFile, "utf8")) as Partial<TriajeGuardado>[])
      .map(normalizarTriajeLocal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

const guardarLocales = async (triajes: TriajeGuardado[]): Promise<void> => {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(triajesFile, JSON.stringify(triajes, null, 2), "utf8");
};

export const tipoPersistencia = (): "supabase-postgresql" | "json-local" =>
  supabaseSolicitado() ? "supabase-postgresql" : "json-local";

export const persistenciaConfigurada = (): boolean =>
  !supabaseSolicitado() || supabaseConfigurado();

export const verificarPersistencia = async (): Promise<boolean> => {
  if (!usarSupabase()) return true;
  await peticionSupabase("?select=id&limit=1", { method: "GET" });
  return true;
};

export const listarTriajes = async (): Promise<TriajeGuardado[]> => {
  if (!usarSupabase()) {
    return (await leerLocales()).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }
  const respuesta = await peticionSupabase("?select=*&order=creado_en.desc", { method: "GET" });
  return ((await respuesta.json()) as TriajeSupabase[]).map(desdeSupabase);
};

export const crearTriaje = async (datos: DatosTriaje, opciones?: {
  id?: string;
  creadoEn?: Date;
}): Promise<TriajeGuardado> => {
  if (!usarSupabase()) {
    const nuevo: TriajeGuardado = {
      ...datos,
      id: opciones?.id ?? crypto.randomUUID(),
      creadoEn: (opciones?.creadoEn ?? new Date()).toISOString(),
    };
    const triajes = await leerLocales();
    triajes.push(nuevo);
    await guardarLocales(triajes);
    return nuevo;
  }

  const payload = {
    ...haciaSupabase(datos),
    ...(opciones?.id ? { id: opciones.id } : {}),
    ...(opciones?.creadoEn ? { creado_en: opciones.creadoEn.toISOString() } : {}),
  };
  const respuesta = await peticionSupabase("", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  const [nuevo] = (await respuesta.json()) as TriajeSupabase[];
  if (!nuevo) throw new Error("Supabase no devolvió el triaje creado.");
  return desdeSupabase(nuevo);
};

export const actualizarTriaje = async (id: string, datos: DatosTriaje): Promise<TriajeGuardado | null> => {
  if (!usarSupabase()) {
    const triajes = await leerLocales();
    const indice = triajes.findIndex((triaje) => triaje.id === id);
    if (indice === -1) return null;
    const actualizado = { ...triajes[indice]!, ...datos };
    triajes[indice] = actualizado;
    await guardarLocales(triajes);
    return actualizado;
  }

  const respuesta = await peticionSupabase(`?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(haciaSupabase(datos)),
  });
  const [actualizado] = (await respuesta.json()) as TriajeSupabase[];
  return actualizado ? desdeSupabase(actualizado) : null;
};

export const eliminarTriaje = async (id: string): Promise<boolean> => {
  if (!usarSupabase()) {
    const triajes = await leerLocales();
    const restantes = triajes.filter((triaje) => triaje.id !== id);
    if (restantes.length === triajes.length) return false;
    await guardarLocales(restantes);
    return true;
  }

  const respuesta = await peticionSupabase(`?id=eq.${encodeURIComponent(id)}&select=id`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  return ((await respuesta.json()) as Array<{ id: string }>).length > 0;
};

const contarSupabase = async (consulta: string): Promise<number> => {
  const respuesta = await peticionSupabase(`${consulta}&select=id`, {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  });
  const rango = respuesta.headers.get("content-range");
  return Number(rango?.split("/")[1] ?? 0);
};

export const obtenerMetricasDashboard = async (): Promise<MetricasDashboard> => {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  if (!usarSupabase()) {
    const triajes = await leerLocales();
    const deHoy = triajes.filter((triaje) =>
      new Date(triaje.creadoEn).toLocaleDateString("en-CA", { timeZone: "America/Lima" }) === hoy);
    return {
      pacientesHoy: deHoy.length,
      urgenciasAltas: deHoy.filter((triaje) => triaje.urgencia === "ALTA").length,
    };
  }

  const inicio = new Date(`${hoy}T00:00:00-05:00`).toISOString();
  const fin = new Date(new Date(inicio).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const rango = `?creado_en=gte.${encodeURIComponent(inicio)}&creado_en=lt.${encodeURIComponent(fin)}`;
  const [pacientesHoy, urgenciasAltas] = await Promise.all([
    contarSupabase(rango),
    contarSupabase(`${rango}&urgencia=eq.ALTA`),
  ]);
  return { pacientesHoy, urgenciasAltas };
};
