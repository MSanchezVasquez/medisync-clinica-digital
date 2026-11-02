/**
 * NEWS2 (National Early Warning Score 2, Royal College of Physicians).
 * Puntaje de alerta temprana para ADULTOS (>= 16 años), escala 1 de SpO2.
 *
 * Aquí se usa como CAPA DE SEGURIDAD determinista sobre la IA:
 *   urgenciaFinal = max(urgenciaIA, urgenciaMinimaPorSignos)   -> solo puede ESCALAR, nunca bajar.
 *
 * Limitaciones (documentarlas en la sustentación):
 *  - No aplica a menores de 16 años ni a embarazadas (usar PEWS / criterio médico).
 *  - El nivel de conciencia (ACVPU) no lo mide ningún microtriaje: se asume "Alerta" (0 pts).
 *  - Si falta algún parámetro (p. ej. el MT-100 no mide presión), el puntaje es PARCIAL.
 *  - Es apoyo al triaje, no diagnóstico.
 */

export type Urgencia = 'NULA' | 'BAJA' | 'MEDIA' | 'ALTA';
const ORDEN: Urgencia[] = ['NULA', 'BAJA', 'MEDIA', 'ALTA'];

export interface SignosVitales {
  frecuenciaCardiaca?: number | null;
  spo2?: number | null;
  temperatura?: number | null;
  presionSistolica?: number | null;
  presionDiastolica?: number | null;
  frecuenciaRespiratoria?: number | null;
}

export interface ParametroNews2 {
  clave: 'frecuenciaRespiratoria' | 'spo2' | 'presionSistolica' | 'frecuenciaCardiaca' | 'temperatura';
  valor: number;
  puntos: number;
}

export type RiesgoNews2 = 'BAJO' | 'BAJO_MEDIO' | 'MEDIO' | 'ALTO';

export interface ResultadoNews2 {
  aplica: boolean;
  total: number;
  parcial: boolean;
  faltantes: string[];
  parametros: ParametroNews2[];
  riesgo: RiesgoNews2;
  urgenciaMinima: Urgencia;
}

const puntosFR = (v: number) => (v <= 8 ? 3 : v <= 11 ? 1 : v <= 20 ? 0 : v <= 24 ? 2 : 3);
const puntosSpO2 = (v: number) => (v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0);
const puntosPAS = (v: number) => (v <= 90 ? 3 : v <= 100 ? 2 : v <= 110 ? 1 : v <= 219 ? 0 : 3);
const puntosFC = (v: number) => (v <= 40 ? 3 : v <= 50 ? 1 : v <= 90 ? 0 : v <= 110 ? 1 : v <= 130 ? 2 : 3);
const puntosTemp = (v: number) => (v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 38.0 ? 0 : v <= 39.0 ? 1 : 2);

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export const calcularNews2 = (signos: SignosVitales, edad?: number | null): ResultadoNews2 => {
  if (edad != null && edad < 16) {
    return {
      aplica: false, total: 0, parcial: true, faltantes: [], parametros: [],
      riesgo: 'BAJO', urgenciaMinima: 'NULA',
    };
  }

  const defs: Array<[ParametroNews2['clave'], number | null, (v: number) => number]> = [
    ['frecuenciaRespiratoria', num(signos.frecuenciaRespiratoria), puntosFR],
    ['spo2', num(signos.spo2), puntosSpO2],
    ['presionSistolica', num(signos.presionSistolica), puntosPAS],
    ['frecuenciaCardiaca', num(signos.frecuenciaCardiaca), puntosFC],
    ['temperatura', num(signos.temperatura), puntosTemp],
  ];

  const parametros: ParametroNews2[] = [];
  const faltantes: string[] = [];
  for (const [clave, valor, f] of defs) {
    if (valor == null) faltantes.push(clave);
    else parametros.push({ clave, valor, puntos: f(valor) });
  }

  const total = parametros.reduce((a, p) => a + p.puntos, 0);
  const unoEn3 = parametros.some((p) => p.puntos === 3);

  let riesgo: RiesgoNews2 = 'BAJO';
  if (total >= 7) riesgo = 'ALTO';
  else if (total >= 5) riesgo = 'MEDIO';
  else if (unoEn3) riesgo = 'BAJO_MEDIO';

  const urgenciaMinima: Urgencia =
    riesgo === 'ALTO' ? 'ALTA' : riesgo === 'MEDIO' || riesgo === 'BAJO_MEDIO' ? 'MEDIA' : 'NULA';

  return { aplica: true, total, parcial: faltantes.length > 0, faltantes, parametros, riesgo, urgenciaMinima };
};

/** Combina la urgencia de la IA con el mínimo por signos vitales. Solo escala. */
export const combinarUrgencia = (
  ia: Urgencia,
  minimaPorSignos: Urgencia,
): { urgencia: Urgencia; escalada: boolean } => {
  const i = ORDEN.indexOf(ia);
  const m = ORDEN.indexOf(minimaPorSignos);
  return m > i ? { urgencia: minimaPorSignos, escalada: true } : { urgencia: ia, escalada: false };
};
