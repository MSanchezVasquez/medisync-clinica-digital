import type { LecturaIoT } from '../hooks/useTelemetriaIoT';
import { API } from './api';

export type CapturaMonitor = Pick<
  LecturaIoT,
  'frecuenciaCardiaca' | 'temperatura' | 'spo2' | 'timestamp'
>;

export type MedicionesIngreso = {
  peso: number;
  altura: number;
  monitor: CapturaMonitor;
};

export type ContextoTriaje = {
  nombreCompleto: string | null;
  sintomas: string;
  urgencia: string;
  especialidad: string;
  recomendacion?: string;
  edad?: number | null;
  sexo?: string;
  peso?: number | null;
  altura?: number | null;
  mediciones?: MedicionesIngreso;
};

export type PacientePractica = Omit<CapturaMonitor, 'timestamp'> & {
  dni: string;
  nombreCompleto: string;
  edad: number;
  sexo: string;
  peso: number;
  altura: number;
  sintomasEjemplo: string;
};

export type EvaluacionPractica = {
  urgencia: 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
  especialidad: string;
  recomendacion: string;
  origen: 'gemini' | 'ejemplo';
};

export type SesionTriajePractica = {
  ingreso: number;
  paciente: PacientePractica;
  sintomas: string;
  evaluacion?: EvaluacionPractica;
};

export const rutaTriajeDePractica = '/triaje?practica=uci';
export const rutaUciDePractica = '/uci-virtual?practica=triaje';

export const duracionLlegada = 1100;
export const duracionCaptura = 3000;
export const signosInicialesMonitor = { frecuenciaCardiaca: 82, temperatura: 36.8, spo2: 98 };

const claveSesionPractica = 'medisync:triaje-practica:v2';

function esPacientePractica(valor: unknown): valor is PacientePractica {
  if (!valor || typeof valor !== 'object') return false;
  const paciente = valor as Partial<PacientePractica>;
  return (
    typeof paciente.dni === 'string' &&
    /^\d{8}$/.test(paciente.dni) &&
    typeof paciente.nombreCompleto === 'string' &&
    typeof paciente.sexo === 'string' &&
    typeof paciente.sintomasEjemplo === 'string' &&
    [
      paciente.edad,
      paciente.peso,
      paciente.altura,
      paciente.frecuenciaCardiaca,
      paciente.temperatura,
      paciente.spo2,
    ].every(Number.isFinite)
  );
}

function esEvaluacionPractica(valor: unknown): valor is EvaluacionPractica {
  if (!valor || typeof valor !== 'object') return false;
  const evaluacion = valor as Partial<EvaluacionPractica>;
  return (
    (evaluacion.origen === 'gemini' || evaluacion.origen === 'ejemplo') &&
    (evaluacion.urgencia === 'ALTA' ||
      evaluacion.urgencia === 'MEDIA' ||
      evaluacion.urgencia === 'BAJA' ||
      evaluacion.urgencia === 'NULA') &&
    typeof evaluacion.especialidad === 'string' &&
    typeof evaluacion.recomendacion === 'string'
  );
}

export function esSesionPractica(valor: unknown): valor is SesionTriajePractica {
  if (!valor || typeof valor !== 'object') return false;
  const sesion = valor as Partial<SesionTriajePractica>;
  return (
    typeof sesion.ingreso === 'number' &&
    Number.isSafeInteger(sesion.ingreso) &&
    sesion.ingreso > 0 &&
    sesion.ingreso <= Date.now() &&
    esPacientePractica(sesion.paciente) &&
    typeof sesion.sintomas === 'string' &&
    (sesion.evaluacion === undefined || esEvaluacionPractica(sesion.evaluacion))
  );
}

export function leerSesionPractica(): SesionTriajePractica | null {
  try {
    const guardado = window.sessionStorage.getItem(claveSesionPractica);
    const sesion: unknown = guardado ? JSON.parse(guardado) : null;
    return esSesionPractica(sesion) ? sesion : null;
  } catch {
    return null;
  }
}

export function guardarSesionPractica(sesion: SesionTriajePractica | null) {
  try {
    if (sesion) window.sessionStorage.setItem(claveSesionPractica, JSON.stringify(sesion));
    else window.sessionStorage.removeItem(claveSesionPractica);
  } catch {
    // La captura sigue disponible en memoria mientras la página está abierta.
  }
}

export function obtenerMedicionesPractica(
  sesion: SesionTriajePractica,
  ahora: number
): MedicionesIngreso | null {
  const capturadoEn = sesion.ingreso + duracionCaptura;
  if (ahora < capturadoEn) return null;

  const { peso, altura, frecuenciaCardiaca, temperatura, spo2 } = sesion.paciente;
  return {
    peso,
    altura,
    monitor: {
      frecuenciaCardiaca,
      temperatura,
      spo2,
      timestamp: new Date(capturadoEn).toISOString(),
    },
  };
}

export function resumirPractica(
  sesion: SesionTriajePractica,
  mediciones: MedicionesIngreso
): ContextoTriaje | null {
  if (!sesion.evaluacion) return null;

  const { nombreCompleto, edad, sexo } = sesion.paciente;
  const { urgencia, especialidad, recomendacion } = sesion.evaluacion;
  return {
    nombreCompleto,
    edad,
    sexo,
    sintomas: sesion.sintomas,
    urgencia,
    especialidad,
    recomendacion,
    mediciones,
  };
}

async function solicitarPractica(
  ruta: string,
  signal: AbortSignal,
  cuerpo?: { dni: string; sintomas: string }
) {
  const token = localStorage.getItem('medisync_token');
  const respuesta = await fetch(`${API}/triaje/practica${ruta}`, {
    method: cuerpo ? 'POST' : 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal,
  });
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok)
    throw new Error(datos?.error || 'No se pudo completar la solicitud de práctica.');
  return datos as unknown;
}

export async function consultarPacientePractica(dni: string, signal: AbortSignal) {
  const paciente = await solicitarPractica(`/pacientes/${encodeURIComponent(dni)}`, signal);
  if (!esPacientePractica(paciente) || paciente.dni !== dni)
    throw new Error('La ficha del paciente de práctica no es válida.');
  return paciente;
}

export async function evaluarTriajePractica(dni: string, sintomas: string, signal: AbortSignal) {
  const resultado = await solicitarPractica('', signal, { dni, sintomas });
  if (!esEvaluacionPractica(resultado))
    throw new Error('El servidor no devolvió un resultado de triaje válido.');
  return resultado;
}

export function rutaUciDesdeTriaje(id: string) {
  return `/uci-virtual?${new URLSearchParams({ triaje: id })}`;
}
