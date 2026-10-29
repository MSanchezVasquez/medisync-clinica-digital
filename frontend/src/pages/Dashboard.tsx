import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { descargarInformeTriaje } from '../utils/informeTriaje';

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

  interface TelemetriaIoT {
    dispositivoId: string;
    paciente: string;
    frecuenciaCardiaca: number;
    temperatura: number;
    spo2: number;
    timestamp: string;
  }
  const [telemetriaIoT, setTelemetriaIoT] = useState<TelemetriaIoT[]>([]);

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

      // 2. Cargar métricas (o calcularlas en base a los triajes si /dashboard no existe aún)
      try {
        const rm = await fetch(`${API}/dashboard`, { headers: authHeaders });
        if (rm.ok) {
          setMetricas(await rm.json());
        } else {
          // Cálculo reactivo si el endpoint aún no está implementado
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

  useEffect(() => {
    const fetchIoT = async () => {
      try {
        const res = await fetch(`${API}/sensores/stream`);
        if (res.ok) {
          const data = await res.json();
          setTelemetriaIoT(data);
        }
      } catch (e) {
        console.error('Error al sincronizar telemetría IoT', e);
      }
    };

    fetchIoT();
    const interval = setInterval(fetchIoT, 3000); // Actualizar cada 3 segundos
    return () => clearInterval(interval);
  }, []);

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
      // Recargar la lista con la función existente
      cargar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    }
  };

  const tarjeta =
    'bg-white/90 dark:bg-slate-900/90 backdrop-blur p-6 rounded-2xl border border-white dark:border-slate-800 shadow-xl shadow-slate-900/5';

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

      <div className="grid md:grid-cols-3 gap-6 mb-8">
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

      {/* Sección de Monitoreo IoT en Tiempo Real */}
      <section className="mt-8 bg-white/95 dark:bg-slate-900/95 rounded-2xl border border-white dark:border-slate-800 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4 border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-pulse" />
            <h3 className="text-xl font-bold">Monitoreo IoT en Tiempo Real (Camas UCI)</h3>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 rounded-full font-semibold">
            Dispositivo Activo
          </span>
        </div>

        {telemetriaIoT.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="font-semibold">Esperando telemetría del dispositivo simulado...</p>
            <p className="text-xs mt-1">Ejecute el script del emulador IoT en su terminal.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-semibold uppercase">Pulso Cardíaco</p>
                <p className="text-3xl font-bold text-teal-600 mt-1">
                  {telemetriaIoT[0].frecuenciaCardiaca}{' '}
                  <span className="text-sm font-normal text-slate-500">bpm</span>
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Temperatura Corporal
                </p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  {telemetriaIoT[0].temperatura}{' '}
                  <span className="text-sm font-normal text-slate-500">°C</span>
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 font-semibold uppercase">
                  Saturación de Oxígeno (SpO2)
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {telemetriaIoT[0].spo2}{' '}
                  <span className="text-sm font-normal text-slate-500">%</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

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
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 items-start">
                      <button
                        onClick={() =>
                          descargarInformeTriaje({
                            nombreCompleto:
                              t.nombreCompleto ||
                              (t.telefono
                                ? `WhatsApp: ${t.telefono.replace('@lid', '')}`
                                : 'Paciente'),
                            dni: t.dni || 'Sin registrar',
                            edad: t.edad ?? 0,
                            peso: t.peso ?? 0,
                            altura: t.altura ?? 0,
                            sintomas: t.sintomas,
                            urgencia:
                              t.urgencia === 'ALTA' ||
                              t.urgencia === 'MEDIA' ||
                              t.urgencia === 'BAJA'
                                ? t.urgencia
                                : 'MEDIA',
                            especialidad: t.especialidad,
                            recomendacion: t.recomendacion,
                            creadoEn: t.creadoEn || t.fecha || new Date().toISOString(),
                          })
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
