import { readFileSync } from "node:fs";

export const obtenerGeminiApiKey = (): string => {
  const configurada = process.env.GEMINI_API_KEY?.trim();
  if (configurada) return configurada;

  try {
    const contenido = readFileSync(new URL("../.env", import.meta.url), "utf8").trim();
    if (contenido && !contenido.includes("=") && !contenido.includes("\n")) return contenido;
  } catch {
    // La ausencia del archivo se gestiona como configuración faltante.
  }

  return "";
};
