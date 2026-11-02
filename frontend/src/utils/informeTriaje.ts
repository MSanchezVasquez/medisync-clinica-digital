import { jsPDF } from 'jspdf';

/* =========================================================================
 * Informe PDF de triaje — versión con signos vitales de MicroTriajes.
 * Reemplaza frontend/src/utils/informeTriaje.ts
 *
 * Novedades respecto a la versión anterior:
 *  - Tabla de signos vitales con rango de referencia y estado (normal/bajo/alto/crítico).
 *  - Gráficas de FC y SpO2 durante la medición (si el dispositivo envió muestras).
 *  - Ficha del dispositivo (código, tipo, ubicación, calidad de señal, duración, hora).
 *  - Puntaje NEWS2 y aviso cuando la urgencia fue ESCALADA por signos vitales.
 *  - Etiqueta cada parámetro con referencia y estado para facilitar la lectura.
 *  - Varias páginas, IMC, ticket, profesional que registró y pie con paginación.
 *  - Tildes y ñ correctas (la fuente estándar de jsPDF soporta Latin-1).
 *  - Un único mapper (construirDatosInforme) para Dashboard y Triaje: se acabó el código duplicado.
 * ========================================================================= */

export type Urgencia = 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
export type EstadoSigno = 'NORMAL' | 'BAJO' | 'ALTO' | 'CRITICO';
export type ClaveSigno =
  | 'frecuenciaCardiaca' | 'spo2' | 'temperatura'
  | 'presionSistolica' | 'presionDiastolica' | 'frecuenciaRespiratoria';

export interface MuestraSenal { t: number; hr: number; spo2: number }

export interface SignosInforme {
  origen: 'DISPOSITIVO' | 'MANUAL';
  medidoEn?: string | null;
  frecuenciaCardiaca?: number | null;
  spo2?: number | null;
  temperatura?: number | null;
  presionSistolica?: number | null;
  presionDiastolica?: number | null;
  frecuenciaRespiratoria?: number | null;
  news2?: { total: number; riesgo: string; parcial: boolean; aplica?: boolean } | null;
  calidad?: number | null;
  duracionSeg?: number | null;
  dispositivo?: {
    codigo: string;
    nombre?: string | null;
    tipo?: string | null;
    esSimulado?: boolean;
    ubicacion?: string | null;
    firmware?: string | null;
  } | null;
  muestras?: MuestraSenal[] | null;
}

export type DatosInformeTriaje = {
  id?: string;
  nombreCompleto: string;
  dni: string;
  edad: number;
  peso: number;
  altura: number;
  sintomas: string;
  urgencia: Urgencia;
  urgenciaIA?: Urgencia | null;      // lo que dijo la IA antes de combinar con signos vitales
  especialidad: string;
  recomendacion: string;
  creadoEn: string;
  medico?: { nombre: string; cmp?: string | null } | null;
  signosVitales?: SignosInforme | null;
};

/* ---------- Referencias clínicas (mantener alineado con backend/services/signosVitales.ts) ---------- */
export const ETIQUETAS: Record<ClaveSigno, { nombre: string; unidad: string }> = {
  frecuenciaCardiaca: { nombre: 'Frecuencia cardíaca', unidad: 'lpm' },
  spo2: { nombre: 'Saturación de oxígeno (SpO2)', unidad: '%' },
  temperatura: { nombre: 'Temperatura', unidad: '°C' },
  presionSistolica: { nombre: 'Presión sistólica', unidad: 'mmHg' },
  presionDiastolica: { nombre: 'Presión diastólica', unidad: 'mmHg' },
  frecuenciaRespiratoria: { nombre: 'Frecuencia respiratoria', unidad: 'rpm' },
};

const porEdad = (edad: number) => {
  if (edad < 1) return { fc: [100, 160], fr: [30, 60] };
  if (edad < 3) return { fc: [90, 150], fr: [24, 40] };
  if (edad < 6) return { fc: [80, 140], fr: [22, 34] };
  if (edad < 12) return { fc: [70, 120], fr: [18, 30] };
  if (edad < 16) return { fc: [60, 110], fr: [12, 22] };
  return { fc: [60, 100], fr: [12, 20] };
};

export const rangoReferencia = (clave: ClaveSigno, edad: number): [number, number] => {
  const p = porEdad(edad > 0 ? edad : 30);
  switch (clave) {
    case 'frecuenciaCardiaca': return [p.fc[0] as number, p.fc[1] as number];
    case 'frecuenciaRespiratoria': return [p.fr[0] as number, p.fr[1] as number];
    case 'spo2': return [95, 100];
    case 'temperatura': return [36.1, 37.5];
    case 'presionSistolica': return [90, 120];
    case 'presionDiastolica': return [60, 80];
  }
};

const CRITICOS: Record<ClaveSigno, [number, number]> = {
  frecuenciaCardiaca: [40, 130], spo2: [90, 101], temperatura: [35, 39.5],
  presionSistolica: [90, 180], presionDiastolica: [50, 120], frecuenciaRespiratoria: [8, 25],
};

export const clasificarSigno = (clave: ClaveSigno, valor: number, edad: number): EstadoSigno => {
  const [min, max] = rangoReferencia(clave, edad);
  const [cmin, cmax] = CRITICOS[clave];
  if ((edad <= 0 || edad >= 16) && (valor < cmin || valor > cmax)) return 'CRITICO';
  if (valor < min) return 'BAJO';
  if (valor > max) return 'ALTO';
  return 'NORMAL';
};

/* ---------- Colores ---------- */
type RGB = [number, number, number];
const COLOR_URGENCIA: Record<Urgencia, RGB> = {
  ALTA: [220, 38, 38], MEDIA: [217, 119, 6], BAJA: [22, 163, 74], NULA: [100, 116, 139],
};
const COLOR_ESTADO: Record<EstadoSigno, RGB> = {
  NORMAL: [21, 128, 61], BAJO: [180, 83, 9], ALTO: [180, 83, 9], CRITICO: [185, 28, 28],
};
const TEAL: RGB = [15, 118, 110];
const OSCURO: RGB = [30, 41, 59];
const GRIS: RGB = [100, 116, 139];

const M = 16;          // margen
const W = 178;         // ancho útil
const Y_MAX = 268;     // límite inferior antes del pie
const TIPO_NOMBRE: Record<string, string> = {
  ESTACION_BASICA: 'Estación básica de signos vitales',
  MONITOR_MULTIPARAMETRO: 'Monitor multiparámetro',
};

/* ---------- Mapper único desde el registro de la API ---------- */
export interface TriajeApi {
  id: string;
  nombreCompleto?: string | null;
  telefono?: string | null;
  dni?: string | null;
  edad?: number | null;
  peso?: number | null;
  altura?: number | null;
  sintomas: string;
  urgencia: string;
  urgenciaIA?: string | null;
  especialidad: string;
  recomendacion: string;
  fecha?: string;
  creadoEn?: string;
  medico?: { nombre: string; cmp?: string | null } | null;
  frecuenciaCardiaca?: number | null;
  spo2?: number | null;
  temperatura?: number | null;
  presionSistolica?: number | null;
  presionDiastolica?: number | null;
  frecuenciaRespiratoria?: number | null;
  news2?: number | null;
  news2Riesgo?: string | null;
  news2Parcial?: boolean | null;
  sesionMedicion?: {
    finalizadaEn?: string | null;
    calidad?: number | null;
    duracionSeg?: number | null;
    muestras?: MuestraSenal[] | null;
    dispositivo?: SignosInforme['dispositivo'];
  } | null;
}

const urg = (u?: string | null): Urgencia =>
  u === 'ALTA' || u === 'MEDIA' || u === 'BAJA' || u === 'NULA' ? u : 'MEDIA';

export const construirDatosInforme = (t: TriajeApi): DatosInformeTriaje => {
  const tieneSignos = [t.frecuenciaCardiaca, t.spo2, t.temperatura, t.presionSistolica, t.frecuenciaRespiratoria]
    .some((v) => v != null);
  const s = t.sesionMedicion ?? null;

  const signos: SignosInforme | null = tieneSignos
    ? {
        origen: s ? 'DISPOSITIVO' : 'MANUAL',
        medidoEn: s?.finalizadaEn ?? null,
        frecuenciaCardiaca: t.frecuenciaCardiaca,
        spo2: t.spo2,
        temperatura: t.temperatura,
        presionSistolica: t.presionSistolica,
        presionDiastolica: t.presionDiastolica,
        frecuenciaRespiratoria: t.frecuenciaRespiratoria,
        news2: t.news2 != null
          ? { total: t.news2, riesgo: t.news2Riesgo ?? 'BAJO', parcial: !!t.news2Parcial }
          : null,
        calidad: s?.calidad ?? null,
        duracionSeg: s?.duracionSeg ?? null,
        dispositivo: s?.dispositivo ?? null,
        muestras: s?.muestras ?? null,
      }
    : null;

  return {
    id: t.id,
    nombreCompleto:
      t.nombreCompleto || (t.telefono ? `WhatsApp: ${t.telefono.replace('@lid', '')}` : 'Paciente'),
    dni: t.dni || 'Sin registrar',
    edad: t.edad ?? 0,
    peso: t.peso ?? 0,
    altura: t.altura ?? 0,
    sintomas: t.sintomas,
    urgencia: urg(t.urgencia),
    urgenciaIA: t.urgenciaIA ? urg(t.urgenciaIA) : null,
    especialidad: t.especialidad,
    recomendacion: t.recomendacion,
    creadoEn: t.creadoEn || t.fecha || new Date().toISOString(),
    medico: t.medico ?? null,
    signosVitales: signos,
  };
};

/* ---------- Generador ---------- */
export const crearPdfInformeTriaje = (t: DatosInformeTriaje) => {
  const pdf = new jsPDF();
  const ticket = t.id ? t.id.split('-')[0] : null;
  let y = 0;

  const color = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const normal = (size = 10.5) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(size); };
  const negrita = (size = 10.5) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(size); };
  const cabeceraCompacta = () => {
    pdf.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
    pdf.rect(0, 0, 210, 28, 'F');
    pdf.setTextColor(255, 255, 255); negrita(13); pdf.text('MediSync Perú', M, 12);
    normal(8.5); pdf.text('Informe de pre-triaje · Continuación', M, 20);
    if (ticket) pdf.text(`Ticket ${ticket}`, 194, 12, { align: 'right' });
  };
  const asegurar = (alto: number) => {
    if (y + alto > Y_MAX) { pdf.addPage(); cabeceraCompacta(); y = 40; }
  };
  const titulo = (txt: string) => {
    asegurar(14);
    color(OSCURO); negrita(12.5);
    pdf.text(txt, M, y);
    pdf.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
    pdf.setLineWidth(0.5);
    pdf.line(M, y + 2, M + 24, y + 2);
    y += 9;
  };
  const parrafo = (txt: string, size = 10.5) => {
    normal(size); color(OSCURO);
    const lineas = pdf.splitTextToSize(txt, W) as string[];
    for (const l of lineas) { asegurar(6); pdf.text(l, M, y); y += 5.3; }
    y += 3;
  };
  const textoAncho = (txt: string, x: number, width: number, size: number, ink: RGB = GRIS) => {
    normal(size); color(ink);
    const lines = pdf.splitTextToSize(txt, width) as string[];
    for (const line of lines) { asegurar(5); pdf.text(line, x, y); y += 4.5; }
  };

  /* --- Cabecera --- */
  pdf.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  pdf.rect(0, 0, 210, 36, 'F');
  pdf.setTextColor(255, 255, 255);
  negrita(20); pdf.text('MediSync Perú', M, 16);
  normal(11); pdf.text('Informe de pre-triaje automatizado', M, 26);
  if (ticket) { normal(9.5); pdf.text(`Ticket: ${ticket}`, 194, 16, { align: 'right' }); }
  normal(9.5); pdf.text(new Date(t.creadoEn).toLocaleString('es-PE'), 194, 26, { align: 'right' });

  /* --- Paciente --- */
  y = 48;
  titulo('Datos del paciente');
  const imc = t.peso > 0 && t.altura > 0 ? t.peso / Math.pow(t.altura / 100, 2) : null;
  const ficha = (label: string, value: string, x: number, top: number, width: number) => {
    color(GRIS); normal(8); pdf.text(label.toUpperCase(), x, top);
    color(OSCURO); negrita(10);
    const lines = pdf.splitTextToSize(value || '—', width) as string[];
    pdf.text(lines, x, top + 5);
    return 5 + Math.max(1, lines.length) * 4.5;
  };
  let fichaH = ficha('Paciente', t.nombreCompleto || 'Paciente', M, y, W);
  y += fichaH + 3;
  asegurar(15);
  ficha('DNI', t.dni || 'Sin registrar', M, y, 54);
  ficha('Edad', t.edad ? `${t.edad} años` : '—', M + 61, y, 34);
  ficha('Peso', t.peso ? `${t.peso} kg` : '—', M + 104, y, 30);
  ficha('Altura / IMC', `${t.altura ? `${t.altura} cm` : '—'} / ${imc ? imc.toFixed(1) : '—'}`, M + 143, y, 35);
  y += 14;

  /* --- Signos vitales --- */
  titulo('Signos vitales');
  const sv = t.signosVitales;
  const claves: ClaveSigno[] = [
    'frecuenciaCardiaca', 'spo2', 'temperatura', 'presionSistolica', 'presionDiastolica', 'frecuenciaRespiratoria',
  ];
  const filas = sv ? claves.filter((c) => sv[c] != null) : [];

  if (!sv || filas.length === 0) {
    parrafo('No se registraron signos vitales instrumentales en este triaje.');
  } else {
    // Ficha del origen de los datos
    color(GRIS); normal(9);
    if (sv.origen === 'DISPOSITIVO' && sv.dispositivo) {
      const d = sv.dispositivo;
      const tipo = d.esSimulado ? 'MicroTriaje' : TIPO_NOMBRE[d.tipo ?? ''] ?? d.tipo;
      const l1 = `Medido con: ${d.codigo}${d.nombre ? ` · ${d.nombre}` : ''}${tipo ? ` (${tipo})` : ''}`;
      textoAncho(l1, M, W, 9);
      const partes = [
        d.ubicacion ? `Ubicación: ${d.ubicacion}` : null,
        sv.medidoEn ? `Fecha de medición: ${new Date(sv.medidoEn).toLocaleString('es-PE')}` : null,
        sv.duracionSeg ? `Duración: ${sv.duracionSeg} s` : null,
        sv.calidad != null ? `Calidad de señal: ${sv.calidad}%` : null,
        d.firmware ? `Firmware: ${d.firmware}` : null,
      ].filter(Boolean) as string[];
      if (partes.length) textoAncho(partes.join('  ·  '), M, W, 8.5);
    } else {
      textoAncho('Origen: ingreso manual por el personal de salud.', M, W, 9);
    }
    y += 2;

    // Tabla
    const colX = [M + 2, M + 80, M + 100, M + 128, M + 158];
    asegurar(10 + filas.length * 7);
    pdf.setFillColor(241, 245, 249);
    pdf.rect(M, y - 5, W, 7.5, 'F');
    color(OSCURO); negrita(9);
    ['Parámetro', 'Valor', 'Unidad', 'Referencia', 'Estado'].forEach((h, i) => pdf.text(h, colX[i] as number, y));
    y += 7;

    filas.forEach((c, idx) => {
      const v = sv[c] as number;
      const [min, max] = rangoReferencia(c, t.edad);
      const estado = clasificarSigno(c, v, t.edad);
      if (idx % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(M, y - 4.6, W, 7, 'F'); }
      color(OSCURO); normal(10);
      pdf.text(ETIQUETAS[c].nombre, colX[0] as number, y);
      negrita(10); pdf.text(String(v), colX[1] as number, y);
      normal(10); color(GRIS); pdf.text(ETIQUETAS[c].unidad, colX[2] as number, y);
      pdf.text(`${min} – ${max}`, colX[3] as number, y);
      color(COLOR_ESTADO[estado]); negrita(9.5);
      pdf.text(estado === 'CRITICO' ? 'CRÍTICO' : estado, colX[4] as number, y);
      y += 7;
    });
    normal(8); color(GRIS);
    pdf.text('Rangos de referencia orientativos para la edad del paciente.', M, y + 1);
    y += 8;

    // Gráficas
    const m = sv.muestras ?? [];
    if (m.length >= 5) {
      asegurar(48);
      const grafica = (x: number, titulo2: string, vals: number[], c: RGB, minFijo?: number, maxFijo?: number) => {
        const w = 86, h = 32;
        const vmin = minFijo ?? Math.min(...vals) - 3;
        const vmax = maxFijo ?? Math.max(...vals) + 3;
        const rango = vmax - vmin || 1;
        color(OSCURO); negrita(8.5); pdf.text(titulo2, x, y);
        pdf.setDrawColor(203, 213, 225); pdf.setLineWidth(0.2);
        pdf.rect(x, y + 2, w, h);
        pdf.setDrawColor(c[0], c[1], c[2]); pdf.setLineWidth(0.6);
        for (let i = 1; i < vals.length; i++) {
          const x1 = x + ((i - 1) / (vals.length - 1)) * w;
          const x2 = x + (i / (vals.length - 1)) * w;
          const y1 = y + 2 + h - (((vals[i - 1] as number) - vmin) / rango) * h;
          const y2 = y + 2 + h - (((vals[i] as number) - vmin) / rango) * h;
          pdf.line(x1, y1, x2, y2);
        }
        color(GRIS); normal(7.5);
        pdf.text(String(Math.round(vmax)), x + 1, y + 6);
        pdf.text(String(Math.round(vmin)), x + 1, y + h);
        pdf.text(`${vals.length} s de medición`, x + w - 1, y + h + 5, { align: 'right' });
      };
      grafica(M, 'Frecuencia cardíaca durante la medición (lpm)', m.map((p) => p.hr), TEAL);
      grafica(M + 92, 'Saturación de oxígeno durante la medición (%)', m.map((p) => p.spo2), [37, 99, 235], undefined, 100);
      y += 42;
    }

    // NEWS2
    if (sv.news2 && sv.news2.aplica !== false) {
      asegurar(28);
      const n = sv.news2;
      const col: RGB = n.riesgo === 'ALTO' ? COLOR_URGENCIA.ALTA : n.riesgo === 'BAJO' ? COLOR_URGENCIA.BAJA : COLOR_URGENCIA.MEDIA;
      pdf.setFillColor(248, 250, 252); pdf.setDrawColor(203, 213, 225); pdf.setLineWidth(0.3);
      pdf.roundedRect(M, y - 4, W, 21, 1.5, 1.5, 'FD');
      color(OSCURO); negrita(10);
      pdf.text(`Puntaje NEWS2: ${n.total}`, M + 3, y + 4);
      color(col); pdf.text(`Riesgo ${n.riesgo.replace('_', '-')}`, M + 52, y + 4);
      color(GRIS); normal(8);
      const notaNews = n.parcial ? 'Puntaje parcial: faltan parámetros para completar el cálculo.' : 'Puntaje orientativo; nivel de conciencia asumido como alerta.';
      pdf.text(pdf.splitTextToSize(notaNews, W - 6) as string[], M + 3, y + 13);
      y += 24;
    }
  }

  /* --- Síntomas --- */
  y += 2;
  titulo('Síntomas reportados');
  parrafo(t.sintomas);

  /* --- Resultado --- */
  asegurar(34);
  titulo('Resultado del triaje');
  const cu = COLOR_URGENCIA[t.urgencia];
  pdf.setFillColor(cu[0], cu[1], cu[2]);
  pdf.roundedRect(M, y - 5, 39, 9, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255); negrita(10.5);
  pdf.text(`URGENCIA ${t.urgencia}`, M + 19.5, y + 1, { align: 'center' });
  color(OSCURO); normal(10);
  const especialidadLineas = pdf.splitTextToSize(`Especialidad sugerida: ${t.especialidad}`, W - 46) as string[];
  pdf.text(especialidadLineas, M + 46, y + 1);
  y += Math.max(11, especialidadLineas.length * 5 + 4);
  if (t.urgenciaIA && t.urgenciaIA !== t.urgencia) {
    color([146, 64, 14]); normal(9);
    const escalada = pdf.splitTextToSize(`La IA clasificó ${t.urgenciaIA}; el sistema la elevó a ${t.urgencia} por los signos vitales medidos.`, W) as string[];
    pdf.text(escalada, M, y);
    y += escalada.length * 4.5 + 2;
  }
  y += 2;

  titulo('Recomendación');
  parrafo(t.recomendacion);

  if (t.medico) {
    asegurar(14);
    color(GRIS); normal(9);
    pdf.text(`Registrado por: ${t.medico.nombre}${t.medico.cmp ? ` · CMP ${t.medico.cmp}` : ''}`, M, y);
    y += 6;
  }

  /* --- Pie de página en todas las páginas --- */
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(203, 213, 225); pdf.setLineWidth(0.3);
    pdf.line(M, 280, 194, 280);
    color(GRIS); normal(8);
    pdf.text('Este informe es orientativo y no sustituye una evaluación médica profesional.', M, 286);
    pdf.text(`Página ${p} de ${total}`, 194, 286, { align: 'right' });
  }

  return pdf;
};

export const descargarInformeTriaje = (t: DatosInformeTriaje) => {
  const dniArchivo = /^\d{8}$/.test(t.dni) ? t.dni : 'sin-dni';
  crearPdfInformeTriaje(t).save(`triaje-${dniArchivo}-${t.creadoEn.slice(0, 10)}.pdf`);
};

export interface InformeMedicionesMicroTriaje {
  id: string;
  finalizadaEn?: string | null;
  duracionSeg?: number | null;
  calidad?: number | null;
  frecuenciaCardiaca?: number | null;
  spo2?: number | null;
  temperatura?: number | null;
  presionSistolica?: number | null;
  presionDiastolica?: number | null;
  frecuenciaRespiratoria?: number | null;
  news2?: number | null;
  muestras?: MuestraSenal[] | null;
  dispositivo?: NonNullable<SignosInforme['dispositivo']>;
}

/** Reporte separado, deliberadamente sin identidad, síntomas ni resultado de IA. */
export const crearPdfSoloMediciones = (m: InformeMedicionesMicroTriaje) => {
  const pdf = new jsPDF();
  const color = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const nombreEquipo = m.dispositivo?.nombre || 'MicroTriaje';
  const fecha = m.finalizadaEn ? new Date(m.finalizadaEn) : new Date();
  const unidad: Record<ClaveSigno, string> = {
    frecuenciaCardiaca: 'lpm', spo2: '%', temperatura: '°C',
    presionSistolica: 'mmHg', presionDiastolica: 'mmHg', frecuenciaRespiratoria: 'rpm',
  };
  const valores: Array<{ clave: ClaveSigno; etiqueta: string; valor: number }> = [
    ...(m.frecuenciaCardiaca != null ? [{ clave: 'frecuenciaCardiaca' as const, etiqueta: 'Frecuencia cardíaca', valor: m.frecuenciaCardiaca }] : []),
    ...(m.spo2 != null ? [{ clave: 'spo2' as const, etiqueta: 'Saturación de oxígeno', valor: m.spo2 }] : []),
    ...(m.temperatura != null ? [{ clave: 'temperatura' as const, etiqueta: 'Temperatura', valor: m.temperatura }] : []),
    ...(m.presionSistolica != null ? [{ clave: 'presionSistolica' as const, etiqueta: 'Presión sistólica', valor: m.presionSistolica }] : []),
    ...(m.presionDiastolica != null ? [{ clave: 'presionDiastolica' as const, etiqueta: 'Presión diastólica', valor: m.presionDiastolica }] : []),
    ...(m.frecuenciaRespiratoria != null ? [{ clave: 'frecuenciaRespiratoria' as const, etiqueta: 'Frecuencia respiratoria', valor: m.frecuenciaRespiratoria }] : []),
  ];

  pdf.setFillColor(TEAL[0], TEAL[1], TEAL[2]); pdf.rect(0, 0, 210, 36, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(19); pdf.text('MediSync Perú', M, 15);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.text('Informe de mediciones · MicroTriaje', M, 25);
  let y = 49;
  color(OSCURO); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text('Datos de la estación', M, y); y += 9;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); color(GRIS);
  pdf.text(`Equipo: ${m.dispositivo?.codigo || '—'} · ${nombreEquipo}`, M, y); y += 6;
  pdf.text(`Ubicación: ${m.dispositivo?.ubicacion || '—'}`, M, y); y += 6;
  pdf.text(`Fecha y hora: ${fecha.toLocaleString('es-PE')}`, M, y); y += 6;
  pdf.text(`Duración: ${m.duracionSeg ?? '—'} s · Calidad de señal: ${m.calidad ?? '—'}%`, M, y); y += 10;
  color(OSCURO); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text('Resultados medidos', M, y); y += 9;
  const filas = valores.map(({ clave, etiqueta, valor }) => ({ etiqueta, valor, unidad: unidad[clave] }));
  pdf.setFillColor(241, 245, 249); pdf.roundedRect(M, y - 5, W, 9, 1, 1, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); color(OSCURO);
  pdf.text('PARÁMETRO', M + 3, y); pdf.text('VALOR MEDIDO', M + 112, y); pdf.text('UNIDAD', M + 158, y); y += 9;
  filas.forEach((f, i) => {
    if (i % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(M, y - 5, W, 8.5, 'F'); }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); color(OSCURO); pdf.text(f.etiqueta, M + 3, y);
    pdf.setFont('helvetica', 'bold'); pdf.text(String(f.valor), M + 112, y);
    pdf.setFont('helvetica', 'normal'); color(GRIS); pdf.text(f.unidad, M + 158, y); y += 8.5;
  });
  y += 4;

  const samples = m.muestras ?? [];
  if (samples.length > 1) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); color(OSCURO); pdf.text('Tendencia durante la medición', M, y + 4); y += 10;
    const draw = (title: string, vals: number[], x: number, col: RGB, min: number, max: number) => {
      const w = 84, h = 36, top = y + 7;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); color(OSCURO); pdf.text(title, x, y + 3);
      pdf.setDrawColor(203, 213, 225); pdf.setLineWidth(0.2); pdf.roundedRect(x, top, w, h, 1, 1);
      pdf.setDrawColor(col[0], col[1], col[2]); pdf.setLineWidth(0.65);
      for (let i = 1; i < vals.length; i++) {
        const x1 = x + ((i - 1) / (vals.length - 1)) * w, x2 = x + (i / (vals.length - 1)) * w;
        const y1 = top + h - ((vals[i - 1]! - min) / (max - min)) * h, y2 = top + h - ((vals[i]! - min) / (max - min)) * h;
        pdf.line(x1, Math.max(top, Math.min(top + h, y1)), x2, Math.max(top, Math.min(top + h, y2)));
      }
    };
    draw('Pulso (lpm)', samples.map((s) => s.hr), M, TEAL, 40, 160);
    draw('SpO2 (%)', samples.map((s) => s.spo2), M + 94, [37, 99, 235], 80, 100);
  }
  pdf.setDrawColor(203, 213, 225); pdf.line(M, 280, 194, 280);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); color(GRIS);
  pdf.text('Este reporte contiene únicamente mediciones y datos técnicos del equipo.', M, 286);
  return pdf;
};

export const descargarPdfSoloMediciones = (m: InformeMedicionesMicroTriaje) => {
  const pdf = crearPdfSoloMediciones(m);
  const codigo = m.dispositivo?.codigo?.replace(/[^a-zA-Z0-9-]/g, '') || 'microtriaje';
  pdf.save(`mediciones-${codigo}-${(m.finalizadaEn || new Date().toISOString()).slice(0, 10)}.pdf`);
};
