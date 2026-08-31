import "dotenv/config";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import express, { type Request, type Response } from "express";
import cors from "cors";

import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

const obtenerApiKey = (): string => {
  const apiKeyConfigurada = process.env.GEMINI_API_KEY?.trim();
  if (apiKeyConfigurada) return apiKeyConfigurada;

  // Compatibilidad con el archivo .env actual, que contiene solo la clave.
  try {
    const contenidoEnv = readFileSync(new URL("../.env", import.meta.url), "utf8").trim();
    return contenidoEnv.includes("=") ? "" : contenidoEnv;
  } catch {
    return "";
  }
};

const apiKey = obtenerApiKey();
console.log(
  `Estado de API Key: ${apiKey ? apiKey.substring(0, 10) + "..." : "¡VACÍA O NO ENCONTRADA!"}`,
);

const genAI = new GoogleGenerativeAI(apiKey);
const dataDirectory = new URL("../data/", import.meta.url);
const triajesFile = new URL("triajes.json", dataDirectory);

type TriajeGuardado = {
  id: string;
  nombreCompleto: string;
  dni: string;
  edad: number;
  peso: number;
  altura: number;
  sintomas: string;
  urgencia: "ALTA" | "MEDIA" | "BAJA";
  especialidad: string;
  recomendacion: string;
  creadoEn: string;
};

const datosTriajeValidos = (datos: Record<string, unknown>): boolean =>
  typeof datos.nombreCompleto === "string" &&
  datos.nombreCompleto.trim().length >= 3 &&
  typeof datos.dni === "string" &&
  /^\d{8}$/.test(datos.dni) &&
  typeof datos.edad === "number" &&
  datos.edad >= 0 &&
  datos.edad <= 120 &&
  typeof datos.peso === "number" &&
  datos.peso > 0 &&
  typeof datos.altura === "number" &&
  datos.altura > 0 &&
  typeof datos.sintomas === "string" &&
  datos.sintomas.trim().length > 0 &&
  typeof datos.urgencia === "string" &&
  ["ALTA", "MEDIA", "BAJA"].includes(datos.urgencia) &&
  typeof datos.especialidad === "string" &&
  typeof datos.recomendacion === "string";

const leerTriajes = async (): Promise<TriajeGuardado[]> => {
  try {
    const guardados = JSON.parse(await readFile(triajesFile, "utf8")) as Partial<TriajeGuardado>[];
    return guardados.map((triaje) => ({
      ...triaje,
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
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

const guardarTriajes = async (triajes: TriajeGuardado[]): Promise<void> => {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(triajesFile, JSON.stringify(triajes, null, 2), "utf8");
};

const limpiarHtml = (valor: string): string =>
  valor
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

app.post("/api/consultar-dni", async (req: Request, res: Response): Promise<void> => {
  const dni = typeof req.body.dni === "string" ? req.body.dni.trim() : "";
  if (!/^\d{8}$/.test(dni)) {
    res.status(400).json({ error: "El DNI debe contener exactamente 8 dígitos." });
    return;
  }

  try {
    const urlConsulta = "https://eldni.com/pe/buscar-datos-por-dni";
    const headersNavegador = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    };

    // El token CSRF está asociado a las cookies de la sesión que carga el formulario.
    const paginaInicial = await fetch(urlConsulta, { headers: headersNavegador });
    if (!paginaInicial.ok) {
      res.status(502).json({ error: "No se pudo iniciar una sesión con el servicio de DNI." });
      return;
    }

    const formularioHtml = await paginaInicial.text();
    const token = formularioHtml.match(
      /name=["']_token["'][^>]*value=["']([^"']+)["']/i,
    )?.[1];
    const cookies = paginaInicial.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";", 1)[0])
      .filter(Boolean)
      .join("; ");

    if (!token || !cookies) {
      res.status(502).json({
        error: "El servicio de DNI no entregó un token o una sesión válidos.",
      });
      return;
    }

    const formulario = new FormData();
    formulario.append("dni", dni);
    formulario.append("_token", token);
    const respuesta = await fetch(urlConsulta, {
      method: "POST",
      headers: {
        ...headersNavegador,
        Referer: urlConsulta,
        Cookie: cookies,
      },
      body: formulario,
    });

    if (!respuesta.ok) {
      res.status(502).json({ error: "El servicio externo de DNI no respondió correctamente." });
      return;
    }

    const html = await respuesta.text();
    const filas = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    let nombreCompleto = "";
    for (const fila of filas) {
      const columnas = [...fila[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((columna) =>
        limpiarHtml(columna[1] ?? ""),
      );
      if (columnas.length >= 4 && columnas[0] === dni) {
        nombreCompleto = [columnas[1], columnas[2], columnas[3]].filter(Boolean).join(" ");
        break;
      }
    }

    if (!nombreCompleto) {
      res.status(404).json({ error: "No se encontraron datos para el DNI ingresado." });
      return;
    }

    res.json({ nombreCompleto });
  } catch (error) {
    console.error("Error al consultar el DNI:", error);
    res.status(502).json({ error: "No se pudo consultar el servicio externo de DNI." });
  }
});

app.get("/api/estado-ia", async (_req: Request, res: Response): Promise<void> => {
  if (!apiKey) {
    res.status(503).json({ activo: false });
    return;
  }

  try {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    res.status(respuesta.ok ? 200 : 503).json({ activo: respuesta.ok });
  } catch {
    res.status(503).json({ activo: false });
  }
});

app.get("/api/dashboard", async (_req: Request, res: Response): Promise<void> => {
  try {
    const triajes = await leerTriajes();
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    const triajesHoy = triajes.filter(
      (triaje) =>
        new Date(triaje.creadoEn).toLocaleDateString("en-CA", {
          timeZone: "America/Lima",
        }) === hoy,
    );

    res.json({
      pacientesHoy: triajesHoy.length,
      urgenciasAltas: triajesHoy.filter((triaje) => triaje.urgencia === "ALTA").length,
    });
  } catch (error) {
    console.error("Error al consultar el dashboard:", error);
    res.status(500).json({ error: "No se pudieron consultar las métricas." });
  }
});

app.get("/api/triajes", async (_req: Request, res: Response): Promise<void> => {
  try {
    const triajes = await leerTriajes();
    res.json(triajes.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)));
  } catch (error) {
    console.error("Error al consultar el historial:", error);
    res.status(500).json({ error: "No se pudo consultar el historial." });
  }
});

app.post("/api/triajes", async (req: Request, res: Response): Promise<void> => {
  if (!datosTriajeValidos(req.body)) {
    res.status(400).json({ error: "Los datos del triaje no son válidos." });
    return;
  }

  try {
    const triajes = await leerTriajes();
    const nuevoTriaje: TriajeGuardado = {
      id: crypto.randomUUID(),
      nombreCompleto: req.body.nombreCompleto.trim(),
      dni: req.body.dni,
      edad: req.body.edad,
      peso: req.body.peso,
      altura: req.body.altura,
      sintomas: req.body.sintomas.trim(),
      urgencia: req.body.urgencia,
      especialidad: req.body.especialidad,
      recomendacion: req.body.recomendacion,
      creadoEn: new Date().toISOString(),
    };
    triajes.push(nuevoTriaje);
    await guardarTriajes(triajes);
    res.status(201).json(nuevoTriaje);
  } catch (error) {
    console.error("Error al guardar el triaje:", error);
    res.status(500).json({ error: "No se pudo guardar el triaje." });
  }
});

app.put("/api/triajes/:id", async (req: Request, res: Response): Promise<void> => {
  if (!datosTriajeValidos(req.body)) {
    res.status(400).json({ error: "Los datos del triaje no son válidos." });
    return;
  }

  try {
    const triajes = await leerTriajes();
    const indice = triajes.findIndex((triaje) => triaje.id === req.params.id);
    if (indice === -1) {
      res.status(404).json({ error: "Triaje no encontrado." });
      return;
    }

    const actualizado: TriajeGuardado = {
      ...triajes[indice]!,
      nombreCompleto: req.body.nombreCompleto.trim(),
      dni: req.body.dni,
      edad: req.body.edad,
      peso: req.body.peso,
      altura: req.body.altura,
      sintomas: req.body.sintomas.trim(),
      urgencia: req.body.urgencia,
      especialidad: req.body.especialidad,
      recomendacion: req.body.recomendacion,
    };
    triajes[indice] = actualizado;
    await guardarTriajes(triajes);
    res.json(actualizado);
  } catch (error) {
    console.error("Error al editar el triaje:", error);
    res.status(500).json({ error: "No se pudo editar el triaje." });
  }
});

app.delete("/api/triajes/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const triajes = await leerTriajes();
    const restantes = triajes.filter((triaje) => triaje.id !== req.params.id);
    if (restantes.length === triajes.length) {
      res.status(404).json({ error: "Triaje no encontrado." });
      return;
    }

    await guardarTriajes(restantes);
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar el triaje:", error);
    res.status(500).json({ error: "No se pudo eliminar el triaje." });
  }
});

app.post("/api/triaje", async (req: Request, res: Response): Promise<void> => {
  const { sintomas } = req.body;

  if (!sintomas) {
    res.status(400).json({ error: "Se requieren los síntomas del paciente." });
    return;
  }

  if (!apiKey) {
    res.status(503).json({
      error: "El servidor no tiene configurada la API key de Gemini.",
    });
    return;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Few-Shot Prompt
    const prompt = `
    Eres un sistema automatizado de pre-triaje para la clínica MediSync Perú.
    Tu trabajo es analizar los síntomas, determinar la urgencia (ALTA, MEDIA, BAJA, NULA) y sugerir una especialidad.
    Usa NULA cuando no exista un síntoma clínicamente relevante, el texto no describa una enfermedad o se indiquen valores normales sin otro malestar (por ejemplo, temperatura de 37 grados). Para urgencia NULA usa "No aplica" como especialidad y explica que no se identifican signos que requieran triaje.
    Debes responder ÚNICAMENTE con un objeto JSON válido, usando las claves "urgencia", "especialidad" y "recomendacion".
    
    Ejemplo 1:
    Síntomas: "Fiebre de 38 grados y malestar general."
    JSON: {"urgencia": "BAJA", "especialidad": "Medicina General", "recomendacion": "Tomar cita por consultorio externo."}
    
    Ejemplo 2:
    Síntomas: "Visión borrosa repentina y parálisis en la mitad de la cara."
    JSON: {"urgencia": "ALTA", "especialidad": "Neurología / Emergencias", "recomendacion": "Acudir de inmediato por el área de emergencias."}

    Ejemplo 3:
    Síntomas: "Tengo 37 grados de temperatura y no tengo ningún malestar."
    JSON: {"urgencia": "NULA", "especialidad": "No aplica", "recomendacion": "No se identifican signos que requieran atención mediante triaje."}

    Ejemplo 4:
    Síntomas: "Hoy es un día soleado y quiero escuchar música."
    JSON: {"urgencia": "NULA", "especialidad": "No aplica", "recomendacion": "El texto no describe síntomas ni una condición médica."}
    
    Caso real a evaluar:
    Síntomas: "${sintomas}"
    JSON:
    `;

    // Enviamos el prompt a la IA
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonLimpiado = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const aiResponse = JSON.parse(jsonLimpiado);

    res.json(aiResponse);
  } catch (error) {
    console.error("Error con la IA:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? `Gemini no pudo procesar el triaje: ${error.message}`
          : "Error interno al procesar el triaje con Inteligencia Artificial.",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Servidor Backend de MediSync corriendo en http://localhost:${PORT}`,
  );
});
