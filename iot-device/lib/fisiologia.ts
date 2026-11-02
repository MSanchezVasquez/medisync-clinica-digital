/**
 * Motor de fisiología simulada de MediSync.
 * Genera signos vitales COHERENTES entre sí (no aleatorios sueltos):
 *  - Línea base por edad.
 *  - Un "escenario clínico" (inferido de los síntomas o forzado en modo demo) que desplaza los valores
 *    de forma correlacionada (p. ej. fiebre => sube la FC ~10 lpm por °C).
 *  - Variabilidad realista muestra a muestra (arritmia sinusal respiratoria + ruido AR(1)).
 *  - Fase de estabilización del sensor (las primeras lecturas no son válidas, como en un MAX30102 real).
 *  - Artefactos de movimiento ocasionales y un índice de calidad de señal (SQI).
 *  - Reproducible: misma semilla => misma sesión (útil para pruebas y demos).
 */

export type Escenario =
  | 'ESTABLE' | 'FEBRIL' | 'RESPIRATORIO' | 'CARDIACO'
  | 'HIPOVOLEMIA' | 'DOLOR' | 'ANSIEDAD' | 'CRITICO';

export interface PerfilPaciente {
  edad: number;
  sintomas?: string;
  escenario?: Escenario; // si viene, manda sobre lo inferido (modo demo)
}

export interface Objetivo {
  hr: number; spo2: number; temp: number; sbp: number; dbp: number; rr: number;
}

export interface Muestra {
  t: number;          // segundo dentro de la fase de medición
  hr: number;
  spo2: number;
  valida: boolean;    // false durante estabilización o con artefacto
}

export interface ResultadoMedicion {
  frecuenciaCardiaca: number;
  spo2: number;
  temperatura: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  frecuenciaRespiratoria?: number;
  calidad: number;    // 0-100
}

/* ---------- RNG determinista ---------- */
export const crearRng = (semilla: string | number) => {
  let h = 1779033703 ^ String(semilla).length;
  for (const c of String(semilla)) {
    h = Math.imul(h ^ c.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (h ^ (h >>> 16)) >>> 0;
  const uniforme = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    const u = Math.max(uniforme(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * uniforme());
  };
  const entre = (min: number, max: number) => min + (max - min) * uniforme();
  return { uniforme, gauss, entre };
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/* ---------- Inferencia de escenario desde síntomas (texto libre) ---------- */
export const inferirEscenario = (sintomas?: string): Escenario => {
  const s = (sintomas ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const tiene = (...p: string[]) => p.some((x) => s.includes(x));
  if (tiene('no respira', 'inconsciente', 'convulsion', 'cianosis', 'labios morados')) return 'CRITICO';
  if (tiene('falta de aire', 'dificultad para respirar', 'ahogo', 'asma', 'sibilancia', 'tos con flema', 'no puedo respirar'))
    return 'RESPIRATORIO';
  if (tiene('dolor de pecho', 'opresion', 'palpitacion', 'dolor en el pecho', 'brazo izquierdo')) return 'CARDIACO';
  if (tiene('fiebre', 'calentura', 'escalofrio', 'dengue', 'temperatura alta')) return 'FEBRIL';
  if (tiene('vomito', 'diarrea', 'deshidrat', 'desmayo', 'mareo', 'sangrado', 'hemorragia')) return 'HIPOVOLEMIA';
  if (tiene('dolor intenso', 'dolor fuerte', 'cólico', 'colico', 'fractura', 'golpe', 'accidente', 'dolor abdominal'))
    return 'DOLOR';
  if (tiene('ansiedad', 'nervios', 'panico', 'angustia')) return 'ANSIEDAD';
  return 'ESTABLE';
};

/* ---------- Línea base por edad ---------- */
const baseEdad = (edad: number) => {
  const hr = edad < 1 ? 125 : edad < 3 ? 110 : edad < 6 ? 98 : edad < 12 ? 86 : edad < 16 ? 78 : 74;
  const rr = edad < 1 ? 40 : edad < 3 ? 30 : edad < 6 ? 26 : edad < 12 ? 20 : edad < 16 ? 16 : 15;
  const sbp =
    edad < 12 ? clamp(92 + edad * 1.5, 92, 110) : edad < 16 ? 108 : clamp(114 + Math.max(0, edad - 30) * 0.45, 114, 150);
  return { hr, rr, sbp, dbp: sbp * 0.64 };
};

export const construirObjetivo = (perfil: PerfilPaciente, seed: string | number): { objetivo: Objetivo; escenario: Escenario } => {
  const r = crearRng(`obj:${seed}`);
  const escenario = perfil.escenario ?? inferirEscenario(perfil.sintomas);
  const b = baseEdad(perfil.edad);

  const o: Objetivo = {
    hr: b.hr + r.gauss() * 5,
    spo2: 97.6 + r.gauss() * 0.7,
    temp: 36.6 + r.gauss() * 0.2,
    sbp: b.sbp + r.gauss() * 7,
    dbp: b.dbp + r.gauss() * 5,
    rr: b.rr + r.gauss() * 1.2,
  };

  switch (escenario) {
    case 'FEBRIL':
      o.temp = r.entre(38.1, 39.6);
      o.hr += 10 * (o.temp - 37);        // ~10 lpm por °C
      o.rr += 2 * (o.temp - 37);
      o.sbp -= 4;
      break;
    case 'RESPIRATORIO':
      o.spo2 = r.entre(88, 94);
      o.rr += r.entre(7, 13);
      o.hr += r.entre(12, 22);
      o.temp += r.entre(0, 0.8);
      break;
    case 'CARDIACO':
      o.hr += r.entre(14, 32);
      o.sbp += r.entre(15, 32);
      o.dbp += r.entre(8, 16);
      o.spo2 = r.entre(94, 97.5);
      o.rr += r.entre(2, 5);
      break;
    case 'HIPOVOLEMIA':
      o.hr += r.entre(20, 34);
      o.sbp -= r.entre(18, 32);
      o.dbp -= r.entre(10, 18);
      o.rr += r.entre(2, 5);
      break;
    case 'DOLOR':
      o.hr += r.entre(10, 20);
      o.sbp += r.entre(8, 22);
      o.rr += r.entre(2, 5);
      break;
    case 'ANSIEDAD':
      o.hr += r.entre(10, 20);
      o.rr += r.entre(2, 5);
      o.sbp += r.entre(4, 12);
      break;
    case 'CRITICO':
      o.spo2 = r.entre(82, 89);
      o.hr = r.entre(122, 142);
      o.sbp = r.entre(78, 92);
      o.dbp = o.sbp * 0.6;
      o.rr = r.entre(27, 34);
      o.temp = r.entre(38.4, 39.8);
      break;
    default:
      break;
  }

  o.spo2 = clamp(o.spo2, 70, 100);
  o.dbp = Math.min(o.dbp, o.sbp - 20);
  return { objetivo: o, escenario };
};

/* ---------- Generador de muestras (1 por segundo) ---------- */
export const crearGeneradorMuestras = (objetivo: Objetivo, seed: string | number, durEstabilizacion = 10) => {
  const r = crearRng(`mue:${seed}`);
  let ar = 0;
  let tGlobal = 0;

  /** fase: 'ESTABILIZACION' | 'MEDICION' */
  return (fase: 'ESTABILIZACION' | 'MEDICION', tFase: number): Muestra => {
    tGlobal += 1;
    ar = 0.9 * ar + 0.8 * r.gauss();
    const rsa = 2.2 * Math.sin(2 * Math.PI * (objetivo.rr / 60) * tGlobal); // arritmia sinusal respiratoria

    // Durante estabilización el algoritmo converge: más ruido y valores sin validar
    const k = fase === 'ESTABILIZACION' ? clamp(tFase / durEstabilizacion, 0, 1) : 1;
    const ruidoExtra = (1 - k) * 9 * r.gauss();

    let hr = objetivo.hr + rsa + ar + ruidoExtra;
    let spo2 = objetivo.spo2 + 0.35 * r.gauss() - (1 - k) * 4 * r.uniforme();
    let valida = fase === 'MEDICION' || k > 0.7;

    if (fase === 'MEDICION' && r.uniforme() < 0.015) {
      // artefacto de movimiento
      hr += (r.uniforme() < 0.5 ? -1 : 1) * r.entre(15, 30);
      spo2 -= r.entre(3, 6);
      valida = false;
    }
    return { t: tFase, hr: Math.round(clamp(hr, 25, 220)), spo2: Math.round(clamp(spo2, 60, 100)), valida };
  };
};

/* ---------- Resultado final de la sesión ---------- */
export const calcularResultado = (
  objetivo: Objetivo,
  muestras: Muestra[],
  seed: string | number,
  opciones: { conPresion: boolean; conFR: boolean },
): ResultadoMedicion => {
  const r = crearRng(`res:${seed}`);
  const validas = muestras.filter((m) => m.valida);
  const base = validas.length >= 5 ? validas : muestras;

  const frecuenciaCardiaca = Math.round(mediana(base.map((m) => m.hr)));
  const spo2 = Math.round(mediana(base.map((m) => m.spo2)));

  // Termómetro IR: promedio de 3 lecturas, resolución 0.1 °C
  const lecturas = [0, 1, 2].map(() => objetivo.temp + r.gauss() * 0.08);
  const temperatura = Math.round((lecturas.reduce((a, b) => a + b, 0) / 3) * 10) / 10;

  const razonValidas = muestras.length ? validas.length / muestras.length : 0;
  const dispersion = base.length
    ? Math.sqrt(base.reduce((a, m) => a + (m.hr - frecuenciaCardiaca) ** 2, 0) / base.length)
    : 10;
  // SQI: premia % de muestras válidas y baja dispersión; pequeña variación del sensor
  let calidad = 100 * razonValidas - dispersion * 2.2 + r.gauss() * 3;
  if (r.uniforme() < 0.08) calidad -= r.entre(25, 45); // contacto deficiente (8 % de las veces)
  calidad = Math.round(clamp(calidad, 0, 99));

  const res: ResultadoMedicion = { frecuenciaCardiaca, spo2, temperatura, calidad };
  if (opciones.conPresion) {
    res.presionSistolica = Math.round(objetivo.sbp + r.gauss() * 3);
    res.presionDiastolica = Math.round(Math.min(objetivo.dbp + r.gauss() * 2.5, res.presionSistolica - 20));
  }
  if (opciones.conFR) res.frecuenciaRespiratoria = Math.round(clamp(objetivo.rr + r.gauss() * 1, 4, 60));
  return res;
};

export const CALIDAD_MINIMA = 60;
