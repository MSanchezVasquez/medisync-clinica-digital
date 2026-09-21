import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { AiService, ErrorIA } from "./ai/aiService.js";
import { listarPrompts } from "./ai/promptLibrary.js";
import { TECNICAS_PROMPT, type TecnicaPrompt } from "./ai/types.js";
import { obtenerGeminiApiKey } from "./config.js";
import {
  actualizarTriaje,
  crearTriaje,
  eliminarTriaje,
  listarTriajes,
  obtenerMetricasDashboard,
  persistenciaConfigurada,
  tipoPersistencia,
  verificarPersistencia,
} from "./triajes/repository.js";
import type { DatosTriaje } from "./triajes/types.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const apiKey = obtenerGeminiApiKey();
console.log(`Estado de API Key: ${apiKey ? "CONFIGURADA" : "NO CONFIGURADA"}`);
const aiService = new AiService(apiKey);
console.log(`Persistencia: ${tipoPersistencia()}`);

const datosTriajeValidos = (datos: Record<string, unknown>): boolean =>
  typeof datos.nombreCompleto === "string" &&
  datos.nombreCompleto.trim().length >= 3 &&
  typeof datos.dni === "string" &&
  /^\d{8}$/.test(datos.dni) &&
  typeof datos.edad === "number" && datos.edad >= 0 && datos.edad <= 120 &&
  typeof datos.peso === "number" && datos.peso > 0 &&
  typeof datos.altura === "number" && datos.altura > 0 &&
  typeof datos.sintomas === "string" && datos.sintomas.trim().length > 0 &&
  typeof datos.urgencia === "string" && ["ALTA", "MEDIA", "BAJA"].includes(datos.urgencia) &&
  typeof datos.especialidad === "string" && typeof datos.recomendacion === "string";

const extraerDatosTriaje = (body: Record<string, unknown>): DatosTriaje => ({
  nombreCompleto: (body.nombreCompleto as string).trim(),
  dni: body.dni as string,
  edad: body.edad as number,
  peso: body.peso as number,
  altura: body.altura as number,
  sintomas: (body.sintomas as string).trim(),
  urgencia: body.urgencia as DatosTriaje["urgencia"],
  especialidad: body.especialidad as string,
  recomendacion: body.recomendacion as string,
});

const limpiarHtml = (valor: string): string => valor
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"').replace(/&#039;|&apos;/gi, "'").replace(/\s+/g, " ").trim();

app.post("/api/consultar-dni", async (req: Request, res: Response): Promise<void> => {
  const dni = typeof req.body.dni === "string" ? req.body.dni.trim() : "";
  if (!/^\d{8}$/.test(dni)) {
    res.status(400).json({ error: "El DNI debe contener exactamente 8 dígitos." });
    return;
  }
  try {
    const url = "https://eldni.com/pe/buscar-datos-por-dni";
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    };
    const inicial = await fetch(url, { headers });
    if (!inicial.ok) {
      res.status(502).json({ error: "No se pudo iniciar una sesión con el servicio de DNI." });
      return;
    }
    const formularioHtml = await inicial.text();
    const token = formularioHtml.match(/name=["']_token["'][^>]*value=["']([^"']+)["']/i)?.[1];
    const cookies = inicial.headers.getSetCookie().map((c) => c.split(";", 1)[0]).filter(Boolean).join("; ");
    if (!token || !cookies) {
      res.status(502).json({ error: "El servicio de DNI no entregó un token o una sesión válidos." });
      return;
    }
    const formulario = new FormData();
    formulario.append("dni", dni);
    formulario.append("_token", token);
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { ...headers, Referer: url, Cookie: cookies },
      body: formulario,
    });
    if (!respuesta.ok) {
      res.status(502).json({ error: "El servicio externo de DNI no respondió correctamente." });
      return;
    }
    const html = await respuesta.text();
    let nombreCompleto = "";
    for (const fila of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const columnas = [...fila[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => limpiarHtml(c[1] ?? ""));
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
    const respuesta = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": apiKey },
    });
    res.status(respuesta.ok ? 200 : 503).json({ activo: respuesta.ok });
  } catch {
    res.status(503).json({ activo: false });
  }
});

app.get("/api/ia/prompts", (_req: Request, res: Response): void => {
  res.json(listarPrompts());
});

app.get("/api/dashboard", async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(await obtenerMetricasDashboard());
  } catch (error) {
    console.error("Error al consultar el dashboard:", error);
    res.status(500).json({ error: "No se pudieron consultar las métricas." });
  }
});

app.get("/api/triajes", async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json(await listarTriajes());
  } catch {
    res.status(500).json({ error: "No se pudo consultar el historial." });
  }
});

app.post("/api/triajes", async (req: Request, res: Response): Promise<void> => {
  if (!datosTriajeValidos(req.body)) {
    res.status(400).json({ error: "Los datos del triaje no son válidos." });
    return;
  }
  try {
    res.status(201).json(await crearTriaje(extraerDatosTriaje(req.body)));
  } catch (error) {
    console.error("Error al guardar el triaje:", error);
    res.status(500).json({ error: "No se pudo guardar el triaje." });
  }
});

app.put("/api/triajes/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  if (typeof id !== "string" || !id) {
    res.status(400).json({ error: "El identificador del triaje no es válido." });
    return;
  }
  if (!datosTriajeValidos(req.body)) {
    res.status(400).json({ error: "Los datos del triaje no son válidos." });
    return;
  }
  try {
    const actualizado = await actualizarTriaje(id, extraerDatosTriaje(req.body));
    if (!actualizado) {
      res.status(404).json({ error: "Triaje no encontrado." });
      return;
    }
    res.json(actualizado);
  } catch (error) {
    console.error("Error al editar el triaje:", error);
    res.status(500).json({ error: "No se pudo editar el triaje." });
  }
});

app.delete("/api/triajes/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id;
  if (typeof id !== "string" || !id) {
    res.status(400).json({ error: "El identificador del triaje no es válido." });
    return;
  }
  try {
    if (!await eliminarTriaje(id)) {
      res.status(404).json({ error: "Triaje no encontrado." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar el triaje:", error);
    res.status(500).json({ error: "No se pudo eliminar el triaje." });
  }
});

app.get("/api/estado-base-datos", async (_req: Request, res: Response): Promise<void> => {
  const proveedor = tipoPersistencia();
  const configurado = proveedor === "supabase-postgresql" && persistenciaConfigurada();
  try {
    await verificarPersistencia();
    res.json({ proveedor, configurado, conectado: true });
  } catch (error) {
    console.error("Error al verificar la base de datos:", error);
    res.status(503).json({ proveedor, configurado, conectado: false });
  }
});

app.post("/api/triaje", async (req: Request, res: Response): Promise<void> => {
  const tecnicaSolicitada = req.body.tecnica ?? "few-shot";
  if (!TECNICAS_PROMPT.includes(tecnicaSolicitada)) {
    res.status(400).json({ error: "La técnica debe ser zero-shot, one-shot o few-shot." });
    return;
  }
  try {
    const tecnica = tecnicaSolicitada as TecnicaPrompt;
    const respuesta = await aiService.evaluar(req.body.sintomas, tecnica);
    res.json({ ...respuesta, tecnica, promptId: listarPrompts().find((prompt) => prompt.tecnica === tecnica)?.id });
  } catch (error) {
    const errorSeguro = error instanceof ErrorIA ? error : new ErrorIA("CONEXION", 500, "No se pudo procesar el pre-triaje.");
    console.error(`Error IA [${errorSeguro.codigo}]: ${errorSeguro.message}`);
    res.status(errorSeguro.status).json({ error: errorSeguro.message, codigo: errorSeguro.codigo });
  }
});

app.listen(PORT, () => console.log(`Servidor Backend de MediSync corriendo en http://localhost:${PORT}`));
