import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3000/api';
type Lectura = { id: string; finalizadaEn?: string; duracionSeg?: number; calidad?: number; frecuenciaCardiaca?: number; spo2?: number; temperatura?: number; presionSistolica?: number; presionDiastolica?: number; frecuenciaRespiratoria?: number; news2?: number; muestras?: { t: number; hr: number; spo2: number }[] };
type Dispositivo = { id: string; codigo: string; nombre: string; tipo: string; esSimulado: boolean; activo: boolean; ubicacion?: string; sensores: string[]; estado: string; bateria?: number; senalWifi?: number; firmware?: string; ultimoLatido?: string };
type Detalle = Dispositivo & { sesiones: Lectura[] };
const ESTADO: Record<string, string> = { LIBRE: 'Disponible', MIDIENDO: 'Midiendo', RESERVADO: 'Reservado', COMPLETADO: 'Lectura lista', OFFLINE: 'Desconectado', APAGADO: 'Apagado', MANTENIMIENTO: 'Mantenimiento', ERROR: 'Revisar equipo' };
const SENSOR: Record<string, string> = { FC: 'Pulso', SPO2: 'SpO₂', TEMP: 'Temperatura', PA: 'Presión arterial', FR: 'Respiración' };

const GraficaSenales = ({ muestras }: { muestras: Lectura['muestras'] }) => {
  const datos = muestras ?? [];
  const linea = (clave: 'hr' | 'spo2', min: number, max: number) => datos.map((m, i) => {
    const x = 12 + (i / Math.max(1, datos.length - 1)) * 576;
    const y = 112 - ((m[clave] - min) / (max - min)) * 92;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${Math.max(16, Math.min(112, y)).toFixed(1)}`;
  }).join(' ');
  return <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
    <div className="flex flex-wrap gap-4 items-center justify-between mb-3"><h4 className="font-bold">Tendencia de la última medición</h4><div className="flex gap-4 text-xs"><span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-teal-500" />Pulso</span><span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-blue-500" />SpO₂</span></div></div>
    {datos.length > 1 ? <svg role="img" aria-label="Gráfica de pulso y saturación durante la medición" viewBox="0 0 600 130" className="w-full h-44">
      {[20, 50, 80, 110].map((y) => <line key={y} x1="10" x2="590" y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 5" />)}
      <path d={linea('hr', 40, 160)} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={linea('spo2', 80, 100)} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
    </svg> : <p className="py-10 text-center text-sm text-slate-500">Esta sesión no guardó muestras suficientes para graficar.</p>}
    <p className="text-xs text-slate-500">Tendencia de muestras por segundo; no es una onda clínica cruda.</p>
  </div>;
};

const IlustracionMicrotriaje = () => <div className="rounded-2xl bg-linear-to-br from-slate-950 to-slate-800 p-5 min-h-60 flex items-center justify-center overflow-hidden">
  <img src="/images/microtriaje.png" alt="Dispositivo MicroTriaje MediSync" className="max-h-[340px] w-full object-contain drop-shadow-xl" />
</div>;

export const MicroTriajes = () => {
  const [equipos, setEquipos] = useState<Dispositivo[]>([]);
  const [error, setError] = useState('');
  const [detalleId, setDetalleId] = useState('');
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [sesionId, setSesionId] = useState('');
  const [accionandoId, setAccionandoId] = useState('');
  const [abrirAlta, setAbrirAlta] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [ubicacionNueva, setUbicacionNueva] = useState('');
  const [tipoNuevo, setTipoNuevo] = useState('ESTACION_BASICA');
  const [credencial, setCredencial] = useState<{ codigo: string; clave: string } | null>(null);
  const esAdmin = (() => { try { return JSON.parse(localStorage.getItem('medisync_user') || '{}').rol === 'ADMIN'; } catch { return false; } })();
  const token = localStorage.getItem('medisync_token') || '';
  const cabeceras = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/dispositivos`, { headers: cabeceras });
      if (!r.ok) throw new Error('No se pudo consultar el inventario de MicroTriajes.');
      setEquipos(await r.json()); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de conexión.'); }
  }, [cabeceras]);
  const cargarDetalle = useCallback(async (id: string, lecturaId?: string) => {
    setDetalleId(id);
    try {
      const r = await fetch(`${API}/dispositivos/${id}/detalle`, { headers: cabeceras });
      const data: Detalle = await r.json();
      if (!r.ok) throw new Error((data as unknown as { error?: string }).error || 'No se pudo cargar el detalle.');
      setDetalle(data);
      setSesionId(lecturaId || data.sesiones[0]?.id || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar el detalle.'); }
  }, [cabeceras]);
  useEffect(() => { void cargar(); const id = window.setInterval(() => void cargar(), 5000); return () => window.clearInterval(id); }, [cargar]);
  const vincular = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch(`${API}/dispositivos`, { method: 'POST', headers: { ...cabeceras, 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombreNuevo, ubicacion: ubicacionNueva, tipo: tipoNuevo }) });
    const data = await r.json().catch(() => null);
    if (!r.ok) { setError(data?.error || 'No se pudo vincular el dispositivo.'); return; }
    setCredencial({ codigo: data.codigo, clave: data.clave }); setNombreNuevo(''); setUbicacionNueva(''); await cargar();
  };
  const cambiarEstado = async (d: Dispositivo) => {
    setAccionandoId(d.id);
    try {
      const r = await fetch(`${API}/dispositivos/${d.id}/activo`, { method: 'PATCH', headers: { ...cabeceras, 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !d.activo }) });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || 'No se pudo cambiar el estado.');
      await cargar();
      if (detalleId === d.id) await cargarDetalle(d.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado.'); }
    finally { setAccionandoId(''); }
  };
  const lectura = detalle?.sesiones.find((s) => s.id === sesionId) ?? detalle?.sesiones[0];

  return <main className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10 space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div><p className="text-xs tracking-[0.18em] font-bold text-teal-700 dark:text-teal-400">DISPOSITIVOS CLÍNICOS</p><h2 className="text-3xl font-bold mt-1">MicroTriajes</h2><p className="text-sm text-slate-500 mt-2">Equipos vinculados, conectividad y lecturas recientes.</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/triaje" className="rounded-xl px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm">Iniciar un triaje</Link>{esAdmin && <button onClick={() => { setAbrirAlta(!abrirAlta); setCredencial(null); }} className="rounded-xl px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold hover:border-teal-500">Vincular equipo</button>}</div>
    </header>
    {abrirAlta && <form onSubmit={(e) => void vincular(e)} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm">
      <input required value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} placeholder="Nombre del dispositivo" className="rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent text-sm" />
      <input value={ubicacionNueva} onChange={(e) => setUbicacionNueva(e.target.value)} placeholder="Ubicación" className="rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 bg-transparent text-sm" />
      <select value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value)} className="rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-sm"><option value="ESTACION_BASICA">MicroTriaje · pulso/SpO₂/temperatura</option><option value="MONITOR_MULTIPARAMETRO">MicroTriaje ampliado · incluye PA/FR</option></select>
      <button className="rounded-xl bg-teal-600 text-white text-sm font-semibold">Crear credenciales</button>
      {credencial && <p className="sm:col-span-2 lg:col-span-4 p-3 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 rounded-xl text-sm">Guarda estas credenciales ahora; la clave solo se muestra una vez. Código: <code>{credencial.codigo}</code> · Clave: <code>{credencial.clave}</code></p>}
    </form>}
    {error && <p className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{error}<button className="ml-3 font-bold" onClick={() => setError('')}>Cerrar</button></p>}

    <section className="grid lg:grid-cols-2 gap-4">
      {equipos.map((d) => <article key={d.id} className={`rounded-2xl border bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden ${detalleId === d.id ? 'border-teal-400 dark:border-teal-700' : 'border-slate-200 dark:border-slate-800'}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><button onClick={() => { setDetalleId(detalleId === d.id ? '' : d.id); if (detalleId !== d.id) void cargarDetalle(d.id); }} className="text-left min-w-0 flex-1 group"><p className="font-mono text-xs tracking-wide text-teal-700 dark:text-teal-400">{d.codigo}</p><h3 className="text-lg font-bold mt-1 group-hover:text-teal-700 dark:group-hover:text-teal-300">{d.nombre}</h3><p className="text-sm text-slate-500 mt-1">{d.ubicacion || 'Ubicación pendiente'}</p></button><span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${d.estado === 'LIBRE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : d.estado === 'APAGADO' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : d.estado === 'OFFLINE' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>{ESTADO[d.estado] || d.estado}</span></div>
          <div className="mt-4 flex flex-wrap gap-2">{d.sensores.map((s) => <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">{SENSOR[s] || s}</span>)}</div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-xs"><div><p className="text-slate-500">Última señal</p><b className="block mt-1 text-slate-800 dark:text-slate-200">{d.ultimoLatido ? new Date(d.ultimoLatido).toLocaleTimeString('es-PE') : 'Sin señal'}</b></div><div><p className="text-slate-500">Batería</p><b className="block mt-1 text-slate-800 dark:text-slate-200">{d.bateria == null ? '—' : `${d.bateria}%`}</b></div><div><p className="text-slate-500">WiFi</p><b className="block mt-1 text-slate-800 dark:text-slate-200">{d.senalWifi == null ? '—' : `${d.senalWifi} dBm`}</b></div></div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"><span className={`text-[11px] font-bold tracking-wide ${d.esSimulado ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{d.esSimulado ? 'SIMULADO - DEMO' : 'HARDWARE VINCULADO'}</span><span className="text-xs text-slate-500">{d.tipo === 'MONITOR_MULTIPARAMETRO' ? '≈ 1 min 46 s' : '≈ 52 s'}</span></div>
          <div className="mt-4 flex items-center justify-between"><button onClick={() => { setDetalleId(detalleId === d.id ? '' : d.id); if (detalleId !== d.id) void cargarDetalle(d.id); }} className="text-sm font-semibold text-teal-700 dark:text-teal-400">{detalleId === d.id ? 'Ocultar detalle' : 'Ver gráficas y lecturas'} <span aria-hidden="true">{detalleId === d.id ? '↑' : '↓'}</span></button>{esAdmin && d.esSimulado && <button onClick={() => void cambiarEstado(d)} disabled={accionandoId === d.id || ['MIDIENDO', 'RESERVADO'].includes(d.estado)} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40 ${d.activo ? 'border border-slate-300 dark:border-slate-700 hover:border-red-400 text-slate-700 dark:text-slate-200' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>{accionandoId === d.id ? 'Actualizando…' : d.activo ? 'Apagar' : 'Encender'}</button>}</div>
        </div>
        {detalleId === d.id && detalle && <div className="border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="grid md:grid-cols-[.9fr_1.1fr] gap-4 items-stretch"><IlustracionMicrotriaje /><div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-xs font-bold tracking-wide text-teal-700 dark:text-teal-400">ESTADO DEL EQUIPO</p><h4 className="font-bold text-lg mt-1">{ESTADO[detalle.estado] || detalle.estado}</h4><dl className="mt-3 grid grid-cols-2 gap-y-3 text-sm"><div><dt className="text-slate-500">Firmware</dt><dd className="font-medium">{detalle.firmware || 'Pendiente'}</dd></div><div><dt className="text-slate-500">Tipo</dt><dd className="font-medium">{detalle.esSimulado ? 'MicroTriaje' : detalle.tipo === 'ESTACION_BASICA' ? 'MicroTriaje · sensores básicos' : 'MicroTriaje ampliado'}</dd></div><div><dt className="text-slate-500">Ubicación</dt><dd className="font-medium">{detalle.ubicacion || '—'}</dd></div><div><dt className="text-slate-500">Lecturas</dt><dd className="font-medium">{detalle.sesiones.length} recientes</dd></div></dl></div></div>
          {detalle.sesiones.length > 0 ? <>
            <label className="block text-xs font-semibold text-slate-500">LECTURA PARA REVISAR<select value={lectura?.id || ''} onChange={(e) => setSesionId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-sm text-slate-800 dark:text-slate-100">{detalle.sesiones.map((s) => <option key={s.id} value={s.id}>{s.finalizadaEn ? new Date(s.finalizadaEn).toLocaleString('es-PE') : 'Fecha no disponible'} · {s.frecuenciaCardiaca ?? '—'} lpm · SpO₂ {s.spo2 ?? '—'}%</option>)}</select></label>
            {lectura && <><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">{[
              ['Pulso', lectura.frecuenciaCardiaca, 'lpm'], ['SpO₂', lectura.spo2, '%'], ['Temperatura', lectura.temperatura, '°C'],
              ['Presión', lectura.presionSistolica && lectura.presionDiastolica ? `${lectura.presionSistolica}/${lectura.presionDiastolica}` : null, 'mmHg'], ['Respiración', lectura.frecuenciaRespiratoria, 'rpm'], ['Calidad', lectura.calidad, '%'],
            ].map(([etiqueta, valor, unidad]) => <div key={String(etiqueta)} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3"><p className="text-[11px] text-slate-500">{etiqueta}</p><p className="font-bold text-lg mt-1">{valor ?? '—'}<small className="ml-1 text-[10px] font-normal text-slate-500">{unidad}</small></p></div>)}</div><GraficaSenales muestras={lectura.muestras} /><p className="text-xs text-slate-500">Medición de {lectura.duracionSeg ?? '—'} s{lectura.news2 != null ? ` · NEWS2 ${lectura.news2}` : ''} · {lectura.finalizadaEn ? new Date(lectura.finalizadaEn).toLocaleString('es-PE') : ''}</p></>}
          </> : <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 text-sm text-slate-500">Todavía no hay mediciones registradas para este equipo. Inicia un triaje y asígnalo a esta estación para ver su primera gráfica.</div>}
        </div>}
        {detalleId === d.id && !detalle && <p className="p-5 text-sm text-slate-500">Cargando detalle…</p>}
      </article>)}
    </section>
    {equipos.length === 0 && !error && <p className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 text-slate-500">Cargando equipos vinculados…</p>}
  </main>;
};
