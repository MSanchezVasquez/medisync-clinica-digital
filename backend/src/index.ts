import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";

import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || "";
console.log(
  `🔑 Estado de API Key: ${apiKey ? apiKey.substring(0, 10) + "..." : "¡VACÍA O NO ENCONTRADA!"}`,
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.post("/api/triaje", async (req: Request, res: Response): Promise<void> => {
  const { sintomas } = req.body;

  if (!sintomas) {
    res.status(400).json({ error: "Se requieren los síntomas del paciente." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // Few-Shot Prompt
    const prompt = `
    Eres un sistema automatizado de pre-triaje para la clínica MediSync Perú.
    Tu trabajo es analizar los síntomas, determinar la urgencia (ALTA, MEDIA, BAJA) y sugerir una especialidad.
    Debes responder ÚNICAMENTE con un objeto JSON válido, usando las claves "urgencia", "especialidad" y "recomendacion".
    
    Ejemplo 1:
    Síntomas: "Fiebre de 38 grados y malestar general."
    JSON: {"urgencia": "BAJA", "especialidad": "Medicina General", "recomendacion": "Tomar cita por consultorio externo."}
    
    Ejemplo 2:
    Síntomas: "Visión borrosa repentina y parálisis en la mitad de la cara."
    JSON: {"urgencia": "ALTA", "especialidad": "Neurología / Emergencias", "recomendacion": "Acudir de inmediato por el área de emergencias."}
    
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
      error: "Error interno al procesar el triaje con Inteligencia Artificial.",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor Backend de MediSync corriendo en http://localhost:${PORT}`,
  );
});
