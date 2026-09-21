import "dotenv/config";
import { readFile } from "node:fs/promises";
import { crearTriaje } from "../triajes/repository.js";
import type { TriajeGuardado } from "../triajes/types.js";

const confirmar = process.argv.includes("--confirmar-envio-datos");
if (!confirmar) {
  throw new Error("Falta --confirmar-envio-datos. El archivo puede contener datos personales.");
}
if (!process.env.SUPABASE_URL?.trim() ||
    !(process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())) {
  throw new Error("SUPABASE_URL y SUPABASE_SECRET_KEY deben estar configuradas.");
}

const archivo = new URL("../../data/triajes.json", import.meta.url);
const triajes = JSON.parse(await readFile(archivo, "utf8")) as TriajeGuardado[];
let importados = 0;

for (const triaje of triajes) {
  const { id, creadoEn, ...datos } = triaje;
  await crearTriaje(datos, { id, creadoEn: new Date(creadoEn) });
  importados += 1;
}
console.log(`Importación completada: ${importados} triajes.`);
