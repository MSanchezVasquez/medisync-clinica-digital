import { useState } from 'react';
import { crearPdfSoloMediciones, descargarPdfSoloMediciones } from '../utils/informeTriaje';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3000/api';
type Dispositivo = { id: string; codigo: string; nombre: string; tipo: string; estado: string; esSimulado: boolean; ubicacion?: string };
type Sesion = { id: string; estado: string; fase?: string; progreso: number; mensajeError?: string; calidad?: number; duracionSeg?: number; frecuenciaCardiaca?: number; spo2?: number; temperatura?: number; presionSistolica?: number; presionDiastolica?: number; frecuenciaRespiratoria?: number; news2?: number; finalizadaEn?: string; muestras?: { t: number; hr: number; spo2: number }[]; dispositivo?: { codigo: string; nombre?: string; tipo?: string; esSimulado?: boolean; ubicacion?: string; firmware?: string } };

type Props = { dispositivos: Dispositivo[]; dispositivoId: string; escenario: string; sesion: Sesion | null; iniciando: boolean; alElegir: (id: string) => void; alCambiarEscenario: (escenario: string) => void; alMedir: () => void; alCancelar: () => void; alReintentar: () => void };
const campo = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500';
const ESTADO: Record<string, string> = { LIBRE: 'Disponible', MIDIENDO: 'Midiendo', RESERVADO: 'Reservado', COMPLETADO: 'Lectura lista', ERROR: 'Revisar equipo', CANCELADA: 'Cancelada', EXPIRADA: 'Vencida' };
const SENSORES: Record<string, string[]> = { ESTACION_BASICA: ['Pulso', 'SpO₂', 'Temperatura'], MONITOR_MULTIPARAMETRO: ['Pulso', 'SpO₂', 'Temperatura', 'Presión', 'Respiración'] };

export const PanelMicroTriaje = ({ dispositivos, dispositivoId, escenario, sesion, iniciando, alElegir, alCambiarEscenario, alMedir, alCancelar, alReintentar }: Props) => {
  const [correo, setCorreo] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [resultadoCorreo, setResultadoCorreo] = useState('');
  const elegido = dispositivos.find((d) => d.id === dispositivoId);
  const terminada = sesion?.estado === 'COMPLETADA';
  return <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden">
    <header className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Signos vitales</h3><p className="text-sm text-slate-500 mt-1">Selecciona un MicroTriaje y registra una lectura para este triaje.</p></div><span className="shrink-0 rounded-lg bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300">MEDICIÓN</span></header>
    <div className="p-5 space-y-4">
      {!sesion && <>
        <div className="grid gap-2.5">
          {dispositivos.filter((d) => d.estado === 'LIBRE').map((d) => <button type="button" key={d.id} onClick={() => alElegir(d.id)} aria-pressed={dispositivoId === d.id} className={`w-full rounded-xl border p-3.5 text-left transition-colors ${dispositivoId === d.id ? 'border-teal-500 bg-teal-50/70 ring-1 ring-teal-500 dark:bg-teal-950/30' : 'border-slate-200 hover:border-teal-300 dark:border-slate-700 dark:hover:border-teal-700'}`}>
            <div className="flex items-start gap-3"><span className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${dispositivoId === d.id ? 'border-teal-600' : 'border-slate-400'}`}>{dispositivoId === d.id && <i className="w-2 h-2 rounded-full bg-teal-600" />}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{d.nombre}</b><small className="font-mono text-xs text-teal-700 dark:text-teal-400">{d.codigo}</small></span><span className="block mt-1 text-xs text-slate-500">{d.ubicacion || 'Ubicación pendiente'} · {d.tipo === 'MONITOR_MULTIPARAMETRO' ? '≈ 1 min 46 s' : '≈ 52 s'}</span><span className="mt-2 flex flex-wrap gap-1.5">{(SENSORES[d.tipo] || []).map((s) => <small key={s} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">{s}</small>)}</span></span></div>
          </button>)}
        </div>
        {elegido?.esSimulado && <label className="block text-xs font-semibold text-slate-500">Escenario de lectura<select className={`${campo} mt-1.5`} value={escenario} onChange={(e) => alCambiarEscenario(e.target.value)}><option value="AUTO">Inferido de los síntomas</option><option value="ESTABLE">Estable</option><option value="FEBRIL">Febril</option><option value="RESPIRATORIO">Respiratorio</option><option value="CARDIACO">Cardíaco</option><option value="HIPOVOLEMIA">Deshidratación</option><option value="DOLOR">Dolor</option><option value="ANSIEDAD">Ansiedad</option><option value="CRITICO">Crítico</option></select></label>}
        {dispositivos.filter((d) => d.estado === 'LIBRE').length === 0 && <p className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-500">No hay equipos disponibles. Revisa MicroTriajes o continúa sin lectura instrumental.</p>}
        <button type="button" onClick={alMedir} disabled={!dispositivoId || iniciando} className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors">{iniciando ? 'Reservando MicroTriaje…' : 'Iniciar medición'}</button>
      </>}

      {sesion && <div className="space-y-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-slate-500">{elegido?.nombre || 'MicroTriaje asignado'}</p><h4 className="font-bold">{terminada ? 'Lectura completada' : ESTADO[sesion.estado] || 'Midiendo'}</h4></div>{!terminada && <span className="text-sm font-bold text-teal-700 dark:text-teal-400">{sesion.progreso}%</span>}</div>
        {!terminada && <><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${sesion.progreso}%` }} /></div><div className="flex justify-between text-xs text-slate-500"><span>{sesion.fase || 'Esperando al equipo'}</span><span>Coloca al paciente según la guía del equipo</span></div></>}
        {terminada && <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[
          ['Pulso', sesion.frecuenciaCardiaca, 'lpm'], ['SpO₂', sesion.spo2, '%'], ['Temperatura', sesion.temperatura, '°C'],
          ['Presión', sesion.presionSistolica && sesion.presionDiastolica ? `${sesion.presionSistolica}/${sesion.presionDiastolica}` : null, 'mmHg'], ['Respiración', sesion.frecuenciaRespiratoria, 'rpm'], ['Calidad', sesion.calidad, '%'],
        ].filter(([, v]) => v != null).map(([label, value, unit]) => <div key={String(label)} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold">{value}<small className="ml-1 text-[10px] font-normal text-slate-500">{unit}</small></p></div>)}</div>}
        {terminada && <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => descargarPdfSoloMediciones({ ...sesion, dispositivo: sesion.dispositivo || (elegido ? { codigo: elegido.codigo, nombre: elegido.nombre, tipo: elegido.tipo, esSimulado: elegido.esSimulado, ubicacion: elegido.ubicacion } : undefined) })} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold hover:border-teal-500">Descargar solo mediciones</button></div>
          <form onSubmit={async (e) => {
            e.preventDefault(); setEnviandoCorreo(true); setResultadoCorreo('');
            try {
              const doc = crearPdfSoloMediciones({ ...sesion, dispositivo: sesion.dispositivo || (elegido ? { codigo: elegido.codigo, nombre: elegido.nombre, tipo: elegido.tipo, esSimulado: elegido.esSimulado, ubicacion: elegido.ubicacion } : undefined) });
              const bytes = new Uint8Array(doc.output('arraybuffer'));
              let binario = ''; for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
              const token = localStorage.getItem('medisync_token') || '';
              const r = await fetch(`${API}/mediciones/${sesion.id}/correo`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ correo, pdfBase64: btoa(binario) }) });
              const data = await r.json().catch(() => null); if (!r.ok) throw new Error(data?.error || 'No se pudo enviar el correo.');
              setResultadoCorreo('Informe de mediciones enviado.');
            } catch (error) { setResultadoCorreo(error instanceof Error ? error.message : 'No se pudo enviar el correo.'); }
            finally { setEnviandoCorreo(false); }
          }} className="flex flex-col sm:flex-row gap-2">
            <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Correo destinatario" className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm" />
            <button disabled={enviandoCorreo} className="rounded-lg bg-slate-800 dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{enviandoCorreo ? 'Enviando…' : 'Enviar reporte PDF'}</button>
          </form>
          {resultadoCorreo && <p className="text-xs text-slate-500">{resultadoCorreo}</p>}
        </div>}
        {sesion.estado === 'ERROR' && <p className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">{sesion.mensajeError || 'No se obtuvo una lectura fiable.'}</p>}
        <div className="flex justify-between gap-3">{terminada || sesion.estado === 'ERROR' || sesion.estado === 'CANCELADA' || sesion.estado === 'EXPIRADA' ? <button type="button" onClick={alReintentar} className="text-sm font-semibold text-teal-700 dark:text-teal-400">Elegir otra estación</button> : <span className="text-xs text-slate-500">La medición se adjuntará al triaje al evaluarlo.</span>}{!terminada && <button type="button" onClick={alCancelar} className="text-sm font-semibold text-slate-500 hover:text-red-600">Cancelar</button>}</div>
      </div>}
    </div>
  </section>;
};
