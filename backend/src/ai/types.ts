export const TECNICAS_PROMPT = ["zero-shot", "one-shot", "few-shot"] as const;

export type TecnicaPrompt = (typeof TECNICAS_PROMPT)[number];
export type Urgencia = "ALTA" | "MEDIA" | "BAJA" | "NULA";

export type DiagnosticoIA = {
  urgencia: Urgencia;
  especialidad: string;
  recomendacion: string;
};

export type PromptDefinition = {
  id: string;
  nombre: string;
  tecnica: TecnicaPrompt;
  objetivo: string;
  casoUso: string;
  variables: string[];
  resultadoEsperado: string;
  justificacion: string;
  construir: (sintomas: string) => string;
};
