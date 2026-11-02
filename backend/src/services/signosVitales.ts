/**
 * Validación, rangos de referencia y alertas de signos vitales.
 * Se usa en: backend (al recibir resultados del dispositivo y al guardar triaje manual),
 * y se replica el mismo criterio en el PDF/UI (ver informeTriaje.ts).
 */
import type { SignosVitales } from './news2.js';

export type ClaveSigno = keyof SignosVitales;

/** Límites FISIOLÓGICAMENTE POSIBLES. Fuera de esto = error de sensor, se rechaza. */
export const LIMITES: Record<ClaveSigno, [number, number]> = {
  frecuenciaCardiaca: [20, 250],
  spo2: [50, 100],
  temperatura: [30, 43],
  presionSistolica: [50, 260],
  presionDiastolica: [20, 160],
  frecuenciaRespiratoria: [4, 60],
};

export const UNIDADES: Record<ClaveSigno, string> = {
  frecuenciaCardiaca: 'lpm',
  spo2: '%',
  temperatura: '°C',
  presionSistolica: 'mmHg',
  presionDiastolica: 'mmHg',
  frecuenciaRespiratoria: 'rpm',
};

export const ETIQUETAS: Record<ClaveSigno, string> = {
  frecuenciaCardiaca: 'Frecuencia cardíaca',
  spo2: 'Saturación de oxígeno (SpO2)',
  temperatura: 'Temperatura',
  presionSistolica: 'Presión sistólica',
  presionDiastolica: 'Presión diastólica',
  frecuenciaRespiratoria: 'Frecuencia respiratoria',
};

export type EstadoSigno = 'NORMAL' | 'BAJO' | 'ALTO' | 'CRITICO';

/** Rangos orientativos por edad para FC y FR (referencias pediátricas habituales). Validar con pediatría. */
const porEdad = (edad: number | null | undefined) => {
  const e = edad ?? 30;
  if (e < 1) return { fc: [100, 160], fr: [30, 60] };
  if (e < 3) return { fc: [90, 150], fr: [24, 40] };
  if (e < 6) return { fc: [80, 140], fr: [22, 34] };
  if (e < 12) return { fc: [70, 120], fr: [18, 30] };
  if (e < 16) return { fc: [60, 110], fr: [12, 22] };
  return { fc: [60, 100], fr: [12, 20] };
};

export const rangoReferencia = (clave: ClaveSigno, edad?: number | null): [number, number] => {
  const p = porEdad(edad);
  switch (clave) {
    case 'frecuenciaCardiaca': return p.fc as [number, number];
    case 'frecuenciaRespiratoria': return p.fr as [number, number];
    case 'spo2': return [95, 100];
    case 'temperatura': return [36.1, 37.5];
    case 'presionSistolica': return [90, 120];
    case 'presionDiastolica': return [60, 80];
  }
};

/** Umbrales críticos (adulto) para resaltar en rojo. */
const CRITICOS: Record<ClaveSigno, [number, number]> = {
  frecuenciaCardiaca: [40, 130],
  spo2: [90, 101],
  temperatura: [35, 39.5],
  presionSistolica: [90, 180],
  presionDiastolica: [50, 120],
  frecuenciaRespiratoria: [8, 25],
};

export const clasificarSigno = (clave: ClaveSigno, valor: number, edad?: number | null): EstadoSigno => {
  const [min, max] = rangoReferencia(clave, edad);
  const [cmin, cmax] = CRITICOS[clave];
  // Para menores de 16 no se usan los críticos de adulto (solo normal/alto/bajo).
  const adulto = edad == null || edad >= 16;
  if (adulto && (valor < cmin || valor > cmax)) return 'CRITICO';
  if (valor < min) return 'BAJO';
  if (valor > max) return 'ALTO';
  return 'NORMAL';
};

export type ResultadoValidacion =
  | { ok: true; signos: SignosVitales }
  | { ok: false; errores: string[] };

/** Valida un objeto recibido (dispositivo o ingreso manual). Ignora campos no reconocidos. */
export const validarSignos = (entrada: unknown): ResultadoValidacion => {
  const errores: string[] = [];
  const signos: SignosVitales = {};
  const src = (entrada ?? {}) as Record<string, unknown>;

  for (const clave of Object.keys(LIMITES) as ClaveSigno[]) {
    const bruto = src[clave];
    if (bruto === undefined || bruto === null || bruto === '') continue;
    const n = Number(bruto);
    const [min, max] = LIMITES[clave];
    if (!Number.isFinite(n) || n < min || n > max) {
      errores.push(`${ETIQUETAS[clave]} fuera de rango fisiológico (${min}-${max}).`);
      continue;
    }
    signos[clave] = clave === 'temperatura' ? Math.round(n * 10) / 10 : Math.round(n);
  }

  if (
    signos.presionSistolica != null &&
    signos.presionDiastolica != null &&
    signos.presionDiastolica >= signos.presionSistolica
  ) {
    errores.push('La presión diastólica debe ser menor que la sistólica.');
  }
  return errores.length ? { ok: false, errores } : { ok: true, signos };
};

export interface AlertaSigno {
  codigo: string;
  severidad: 'CRITICA' | 'ADVERTENCIA';
  mensaje: string;
}

export const generarAlertas = (signos: SignosVitales, edad?: number | null): AlertaSigno[] => {
  const alertas: AlertaSigno[] = [];
  for (const clave of Object.keys(LIMITES) as ClaveSigno[]) {
    const v = signos[clave];
    if (v == null) continue;
    const estado = clasificarSigno(clave, v, edad);
    if (estado === 'NORMAL') continue;
    alertas.push({
      codigo: `${clave.toUpperCase()}_${estado}`,
      severidad: estado === 'CRITICO' ? 'CRITICA' : 'ADVERTENCIA',
      mensaje: `${ETIQUETAS[clave]}: ${v} ${UNIDADES[clave]} (${estado.toLowerCase()}).`,
    });
  }
  return alertas;
};
