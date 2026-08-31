import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { descargarInformeTriaje } from '../utils/informeTriaje';

type Metricas = { pacientesHoy: number; urgenciasAltas: number };
type Triaje = {
  id: string; nombreCompleto: string; dni: string; edad: number; peso: number; altura: number;
  sintomas: string; urgencia: 'ALTA' | 'MEDIA' | 'BAJA'; especialidad: string;
  recomendacion: string; creadoEn: string;
};

const API_URL = 'http://localhost:3000/api';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState<Metricas>({ pacientesHoy: 0, urgenciasAltas: 0 });
  const [historial, setHistorial] = useState<Triaje[]>([]);
  const [editando, setEditando] = useState<Triaje | null>(null);
  const [cargando, setCargando] = useState(true);
  const [estadoIA, setEstadoIA] = useState<'Comprobando' | 'Activo' | 'No disponible'>('Comprobando');

  const cargarDatos = useCallback(async () => {
    try {
      const [rm, rh] = await Promise.all([fetch(`${API_URL}/dashboard`), fetch(`${API_URL}/triajes`)]);
      if (!rm.ok || !rh.ok) throw new Error();
      setMetricas(await rm.json());
      setHistorial(await rh.json());
    } catch {
      toast.error('No se pudo cargar el historial de triajes.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
    fetch(`${API_URL}/estado-ia`)
      .then((r) => setEstadoIA(r.ok ? 'Activo' : 'No disponible'))
      .catch(() => setEstadoIA('No disponible'));
  }, [cargarDatos]);

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      const respuesta = await fetch(`${API_URL}/triajes/${editando.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editando),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        throw new Error(datos?.error || 'No se pudo actualizar el triaje.');
      }
      setEditando(null);
      await cargarDatos();
      toast.success('Triaje actualizado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el triaje.');
    }
  };

  const eliminarTriaje = async (triaje: Triaje) => {
    if (!window.confirm(`¿Eliminar el triaje de ${triaje.nombreCompleto}?`)) return;
    try {
      const respuesta = await fetch(`${API_URL}/triajes/${triaje.id}`, { method: 'DELETE' });
      if (!respuesta.ok) throw new Error();
      await cargarDatos();
      toast.success('Triaje eliminado.');
    } catch {
      toast.error('No se pudo eliminar el triaje.');
    }
  };

  const actualizar = (campo: keyof Triaje, valor: string | number) =>
    setEditando((actual) => actual ? { ...actual, [campo]: valor } : null);

  return <main className="max-w-6xl mx-auto px-6 py-10">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Panel de Control Principal</h2>
      <button onClick={() => navigate('/triaje')} className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-teal-600/20 transition-all active:scale-95">Nueva consulta</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[
        ['Pacientes Hoy', metricas.pacientesHoy, 'text-slate-800 dark:text-slate-100'],
        ['Urgencias Altas', metricas.urgenciasAltas, 'text-red-600'],
        ['Estado de IA', estadoIA, estadoIA === 'Activo' ? 'text-green-600' : estadoIA === 'Comprobando' ? 'text-amber-600' : 'text-red-600'],
      ].map(([titulo, valor, color]) => <div key={titulo} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 rounded-2xl border border-white dark:border-slate-800 shadow-xl shadow-slate-900/5 transition-transform hover:-translate-y-1">
        <h3 className="text-slate-500 text-sm font-medium">{titulo}</h3><p className={`text-3xl font-bold mt-2 ${color}`}>{valor}</p>
      </div>)}
    </div>
    <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-2xl border border-white dark:border-slate-800 shadow-xl shadow-slate-900/5 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800"><h3 className="text-xl font-bold">Historial de triajes</h3><p className="text-sm text-slate-500 mt-1">Consulta, edita, elimina o descarga el informe de cada paciente.</p></div>
      {cargando ? <p className="p-6 text-slate-500">Cargando historial...</p> : historial.length === 0 ? <p className="p-8 text-center text-slate-500">Aún no hay triajes guardados.</p> :
        <div className="divide-y divide-slate-200 dark:divide-slate-800">{historial.map((t) => <article key={t.id} className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2"><h4 className="font-bold text-lg">{t.nombreCompleto}</h4><span className={`text-xs font-bold px-2 py-1 rounded ${t.urgencia === 'ALTA' ? 'bg-red-100 text-red-700' : t.urgencia === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{t.urgencia}</span></div>
            <p className="text-sm text-slate-500">DNI {t.dni || 'sin registrar'} · {t.edad || '—'} años · {t.peso || '—'} kg · {t.altura || '—'} cm</p><p className="text-sm text-slate-500 mt-1">{new Date(t.creadoEn).toLocaleString('es-PE')}</p>
            <p className="text-sm mt-3"><strong>Síntomas:</strong> {t.sintomas}</p><p className="text-sm mt-1"><strong>Especialidad:</strong> {t.especialidad}</p>
          </div><div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={() => descargarInformeTriaje(t)} className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">Descargar informe</button>
            <button onClick={() => setEditando({ ...t })} className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold">Editar</button>
            <button onClick={() => void eliminarTriaje(t)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-semibold">Eliminar</button>
          </div></div>
        </article>)}</div>}
    </section>
    {editando && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
      <form onSubmit={guardarEdicion} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-5">Editar triaje</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-sm font-semibold">Nombre completo<input required value={editando.nombreCompleto} onChange={(e) => actualizar('nombreCompleto', e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
          <label className="text-sm font-semibold">DNI<input required pattern="\d{8}" maxLength={8} value={editando.dni} onChange={(e) => actualizar('dni', e.target.value.replace(/\D/g, ''))} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
          <label className="text-sm font-semibold">Edad<input required type="number" min="0" max="120" value={editando.edad} onChange={(e) => actualizar('edad', Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
          <label className="text-sm font-semibold">Peso (kg)<input required type="number" min="1" step="0.1" value={editando.peso} onChange={(e) => actualizar('peso', Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
          <label className="text-sm font-semibold">Altura (cm)<input required type="number" min="30" max="250" step="0.1" value={editando.altura} onChange={(e) => actualizar('altura', Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
          <label className="sm:col-span-2 text-sm font-semibold">Síntomas<textarea required rows={3} value={editando.sintomas} onChange={(e) => actualizar('sintomas', e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
          <label className="text-sm font-semibold">Urgencia<select value={editando.urgencia} onChange={(e) => actualizar('urgencia', e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-white dark:bg-slate-900"><option>ALTA</option><option>MEDIA</option><option>BAJA</option></select></label>
          <label className="text-sm font-semibold">Especialidad<input required value={editando.especialidad} onChange={(e) => actualizar('especialidad', e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
          <label className="sm:col-span-2 text-sm font-semibold">Recomendación<textarea required rows={3} value={editando.recomendacion} onChange={(e) => actualizar('recomendacion', e.target.value)} className="mt-1 w-full border rounded-lg p-2.5 bg-transparent" /></label>
        </div><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setEditando(null)} className="px-4 py-2 rounded-lg border font-semibold">Cancelar</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Guardar cambios</button></div>
      </form>
    </div>}
  </main>;
};
