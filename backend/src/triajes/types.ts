export type UrgenciaGuardable = "ALTA" | "MEDIA" | "BAJA";

export type TriajeGuardado = {
  id: string;
  nombreCompleto: string;
  dni: string;
  edad: number;
  peso: number;
  altura: number;
  sintomas: string;
  urgencia: UrgenciaGuardable;
  especialidad: string;
  recomendacion: string;
  creadoEn: string;
};

export type DatosTriaje = Omit<TriajeGuardado, "id" | "creadoEn">;

export type MetricasDashboard = {
  pacientesHoy: number;
  urgenciasAltas: number;
};
