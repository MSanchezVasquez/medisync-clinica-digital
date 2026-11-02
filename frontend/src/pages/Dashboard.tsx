import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { construirDatosInforme, descargarInformeTriaje } from '../utils/informeTriaje';

type Triaje = {
  id: string;
  nombreCompleto?: string;
  telefono?: string;
  dni?: string;
  edad?: number;
  peso?: number;
  altura?: number;
  sintomas: string;
  urgencia: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  especialidad: string;
  recomendacion: string;
  creadoEn?: string;
  fecha?: string;
  frecuenciaCardiaca?: number | null;
  spo2?: number | null;
  temperatura?: number | null;
  presionSistolica?: number | null;
  presionDiastolica?: number | null;
  frecuenciaRespiratoria?: number | null;
  news2?: number | null;
  news2Riesgo?: string | null;
  news2Parcial?: boolean;
  urgenciaIA?: string | null;
  medico?: { nombre: string; cmp?: string | null } | null;
  sesionMedicion?: { finalizadaEn?: string | null; calidad?: number | null; duracionSeg?: number | null; muestras?: { t: number; hr: number; spo2: number }[] | null; dispositivo?: { codigo: string; nombre?: string; tipo?: string; esSimulado?: boolean; ubicacion?: string; firmware?: string } | null } | null;
};

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3000/api';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState({ pacientesHoy: 0, urgenciasAltas: 0 });
  const [historial, setHistorial] = useState<Triaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estadoIA, setEstadoIA] = useState<'Comprobando' | 'Activo' | 'No disponible'>(
    'Comprobando'
  );

  const cargar = useCallback(async () => {
    const token = localStorage.getItem('medisync_token');

    if (!token) {
      navigate('/login');
      return;
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    try {
      // 1. Cargar historial de triajes protegidos
      const rh = await fetch(`${API}/triajes`, { headers: authHeaders });

      if (rh.status === 401 || rh.status === 403) {
        localStorage.removeItem('medisync_token');
        localStorage.removeItem('medisync_user');
        toast.error('Sesión vencida. Ingrese nuevamente.');
        navigate('/login');
        return;
      }

      if (!rh.ok) throw new Error('Error al obtener triajes');
      const triajesData: Triaje[] = await rh.json();
      setHistorial(triajesData);

      // 2. Cargar métricas
      try {
        const rm = await fetch(`${API}/dashboard`, { headers: authHeaders });
        if (rm.ok) {
          setMetricas(await rm.json());
        } else {
          setMetricas({
            pacientesHoy: triajesData.length,
            urgenciasAltas: triajesData.filter((t) => t.urgencia === 'ALTA').length,
          });
        }
      } catch {
        setMetricas({
          pacientesHoy: triajesData.length,
          urgenciasAltas: triajesData.filter((t) => t.urgencia === 'ALTA').length,
        });
      }
    } catch (error) {
      console.error('Error cargando triajes:', error);
      toast.error('No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  }, [navigate]);

  useEffect(() => {
    const tareaInicial = window.setTimeout(() => void cargar(), 0);
    fetch(`${API}/estado-ia`)
      .then((r) => setEstadoIA(r.ok ? 'Activo' : 'No disponible'))
      .catch(() => setEstadoIA('No disponible'));
    return () => window.clearTimeout(tareaInicial);
  }, [cargar]);

  const eliminarTriaje = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este registro de triaje?')) return;

    try {
      const token = localStorage.getItem('medisync_token');
      const res = await fetch(`${API}/triajes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'No se pudo eliminar el triaje.');
      }

      toast.success('Triaje eliminado correctamente.');
      cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    }
  };

  const tarjeta =
    'bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 rounded-2xl border border-white dark:border-slate-800 shadow-xl shadow-slate-900/5';

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Panel de control</h2>
          <p className="text-sm text-slate-500 mt-1">Resumen operativo e historial de pacientes.</p>
        </div>
        <button
          onClick={() => navigate('/triaje')}
          className="bg-linear-to-r from-teal-600 to-cyan-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg cursor-pointer"
        >
          Nueva consulta
        </button>
      </div>

      {/* Tarjetas de Métricas Globales */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className={tarjeta}>
          <p className="text-sm text-slate-500">Pacientes hoy</p>
          <p className="text-3xl font-bold mt-2">{metricas.pacientesHoy}</p>
        </div>
        <div className={tarjeta}>
          <p className="text-sm text-slate-500">Urgencias altas</p>
          <p className="text-3xl font-bold mt-2 text-red-600">{metricas.urgenciasAltas}</p>
        </div>
        <div className={tarjeta}>
          <p className="text-sm text-slate-500">Estado de IA</p>
          <p
            className={`text-2xl font-bold mt-2 ${
              estadoIA === 'Activo'
                ? 'text-emerald-600'
                : estadoIA === 'Comprobando'
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {estadoIA}
          </p>
        </div>
      </div>

      <section className="bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-white dark:border-slate-800 shadow-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h3 className="text-xl font-bold">Estaciones de MicroTriaje</h3><p className="text-sm text-slate-500 mt-1">Consulte conexión, disponibilidad, sensores y estado de las lecturas.</p></div>
        <button onClick={() => navigate('/microtriajes')} className="px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold">Ver dispositivos</button>
      </section>

      {/* BLOQUE INDEPENDIENTE 2: Historial de Triajes */}
      <section className="bg-white/90 dark:bg-slate-900/90 rounded-2xl border border-white dark:border-slate-800 shadow-xl overflow-hidden">
        <header className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-bold">Historial de triajes</h3>
          <p className="text-sm text-slate-500 mt-1">
            Edite, elimine o descargue el informe de cada registro.
          </p>
        </header>

        {cargando ? (
          <p className="p-6 text-slate-500">Cargando...</p>
        ) : historial.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Aún no hay triajes guardados.</p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {historial.map((t) => {
              const tituloPaciente =
                t.nombreCompleto ||
                (t.telefono ? `WhatsApp: ${t.telefono.replace('@lid', '')}` : 'Paciente');
              const fechaRegistro = t.creadoEn || t.fecha || new Date().toISOString();

              return (
                <article key={t.id} className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <h4 className="text-lg font-bold">{tituloPaciente}</h4>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            t.urgencia === 'ALTA'
                              ? 'bg-red-100 text-red-700'
                              : t.urgencia === 'MEDIA'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {t.urgencia}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        DNI {t.dni || 'sin registrar'} ·{' '}
                        {t.edad ? `${t.edad} años` : 'Edad no reg.'} ·{' '}
                        {t.peso ? `${t.peso} kg` : 'Peso no reg.'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(fechaRegistro).toLocaleString('es-PE')}
                      </p>
                      <p className="text-sm mt-3">
                        <strong>Síntomas:</strong> {t.sintomas}
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Especialidad:</strong> {t.especialidad}
                      </p>
                      {[t.frecuenciaCardiaca, t.spo2, t.temperatura].some((v) => v != null) && (
                        <p className="text-sm mt-2 text-teal-800 dark:text-teal-300">
                          <strong>Signos vitales:</strong> {t.frecuenciaCardiaca != null ? `FC ${t.frecuenciaCardiaca} lpm · ` : ''}{t.spo2 != null ? `SpO₂ ${t.spo2}% · ` : ''}{t.temperatura != null ? `T ${t.temperatura} °C` : ''}
                          {t.news2 != null && <span className="ml-2 text-xs font-bold">NEWS2 {t.news2}{t.news2Parcial ? ' · parcial' : ''}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 items-start">
                      <button
                        onClick={() =>
                          descargarInformeTriaje(construirDatosInforme(t))
                        }
                        className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold cursor-pointer"
                      >
                        Descargar informe
                      </button>
                      <button
                        onClick={() => navigate('/triaje', { state: { triajeEditar: t } })}
                        className="px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-semibold cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => void eliminarTriaje(t.id)}
                        className="px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
