import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { descargarInformeTriaje } from '../utils/informeTriaje';

type Triaje = {
  id: string; nombreCompleto: string; dni: string; edad: number; peso: number; altura: number;
  sintomas: string; urgencia: 'ALTA' | 'MEDIA' | 'BAJA'; especialidad: string; recomendacion: string; creadoEn: string;
};
const API = 'http://localhost:3000/api';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState({ pacientesHoy: 0, urgenciasAltas: 0 });
  const [historial, setHistorial] = useState<Triaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estadoIA, setEstadoIA] = useState<'Comprobando' | 'Activo' | 'No disponible'>('Comprobando');

  const cargar = useCallback(async () => {
    try {
      const [rm, rh] = await Promise.all([fetch(`${API}/dashboard`), fetch(`${API}/triajes`)]);
      if (!rm.ok || !rh.ok) throw new Error();
      setMetricas(await rm.json()); setHistorial(await rh.json());
    } catch { toast.error('No se pudo cargar el historial.'); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    void cargar();
    fetch(`${API}/estado-ia`).then((r) => setEstadoIA(r.ok ? 'Activo' : 'No disponible')).catch(() => setEstadoIA('No disponible'));
  }, [cargar]);

  const eliminar = async (t: Triaje) => {
    if (!window.confirm(`¿Eliminar el triaje de ${t.nombreCompleto}?`)) return;
    try { const r = await fetch(`${API}/triajes/${t.id}`, { method: 'DELETE' }); if (!r.ok) throw new Error(); await cargar(); toast.success('Triaje eliminado.'); }
    catch { toast.error('No se pudo eliminar el triaje.'); }
  };
  const tarjeta = 'bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 rounded-2xl border border-white dark:border-slate-800 shadow-xl shadow-slate-900/5';

  return <main className="max-w-6xl mx-auto px-6 py-10">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold">Panel de control</h2><p className="text-sm text-slate-500 mt-1">Resumen operativo e historial de pacientes.</p></div><button onClick={() => navigate('/triaje')} className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg">Nueva consulta</button></div>
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <div className={tarjeta}><p className="text-sm text-slate-500">Pacientes hoy</p><p className="text-3xl font-bold mt-2">{metricas.pacientesHoy}</p></div>
      <div className={tarjeta}><p className="text-sm text-slate-500">Urgencias altas</p><p className="text-3xl font-bold mt-2 text-red-600">{metricas.urgenciasAltas}</p></div>
      <div className={tarjeta}><p className="text-sm text-slate-500">Estado de IA</p><p className={`text-2xl font-bold mt-2 ${estadoIA === 'Activo' ? 'text-emerald-600' : estadoIA === 'Comprobando' ? 'text-amber-600' : 'text-red-600'}`}>{estadoIA}</p></div>
    </div>
    <section className="bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-white dark:border-slate-800 shadow-xl overflow-hidden">
      <header className="p-6 border-b border-slate-200 dark:border-slate-800"><h3 className="text-xl font-bold">Historial de triajes</h3><p className="text-sm text-slate-500 mt-1">Edite, elimine o descargue el informe de cada registro.</p></header>
      {cargando ? <p className="p-6 text-slate-500">Cargando...</p> : historial.length === 0 ? <p className="p-8 text-center text-slate-500">Aún no hay triajes guardados.</p> : <div className="divide-y divide-slate-200 dark:divide-slate-800">{historial.map((t) => <article key={t.id} className="p-6"><div className="flex flex-col lg:flex-row justify-between gap-4"><div>
        <div className="flex flex-wrap gap-2 items-center"><h4 className="text-lg font-bold">{t.nombreCompleto}</h4><span className={`text-xs font-bold px-2 py-1 rounded-lg ${t.urgencia === 'ALTA' ? 'bg-red-100 text-red-700' : t.urgencia === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{t.urgencia}</span></div>
        <p className="text-sm text-slate-500 mt-1">DNI {t.dni || 'sin registrar'} · {t.edad || '—'} años · {t.peso || '—'} kg · {t.altura || '—'} cm</p><p className="text-sm text-slate-500">{new Date(t.creadoEn).toLocaleString('es-PE')}</p><p className="text-sm mt-3"><strong>Síntomas:</strong> {t.sintomas}</p><p className="text-sm mt-1"><strong>Especialidad:</strong> {t.especialidad}</p>
      </div><div className="flex flex-wrap gap-2 shrink-0"><button onClick={() => descargarInformeTriaje(t)} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold">Descargar informe</button><button onClick={() => navigate('/triaje', { state: { triajeEditar: t } })} className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold">Editar</button><button onClick={() => void eliminar(t)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold">Eliminar</button></div></div></article>)}</div>}
    </section>
  </main>;
};
