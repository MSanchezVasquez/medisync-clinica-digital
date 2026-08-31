import { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { toast } from 'sonner';
import { descargarInformeTriaje } from '../utils/informeTriaje';

// Interfaz para TypeScript
interface DiagnosticoIA {
  urgencia: 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
  especialidad: string;
  recomendacion: string;
}

export const Triaje = () => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [dni, setDni] = useState('');
  const [consultandoDni, setConsultandoDni] = useState(false);
  const [edad, setEdad] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [diagnostico, setDiagnostico] = useState<DiagnosticoIA | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [triajeGuardado, setTriajeGuardado] = useState(false);

  // Referencias para aislar y apuntar las animaciones de GSAP
  const containerRef = useRef<HTMLElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);

  // Animación de entrada general (Staggering)
  useGSAP(
    () => {
      gsap.from('.gsap-card', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
        ease: 'power3.out',
      });
    },
    { scope: containerRef }
  );

  // Animación de revelación del diagnóstico
  useGSAP(() => {
    if (diagnostico) {
      gsap.from(resultadoRef.current, {
        y: 20,
        opacity: 0,
        scale: 0.95,
        duration: 0.5,
        ease: 'back.out(1.5)',
      });
    }
  }, [diagnostico]); // Se ejecuta cada vez que 'diagnostico' cambia

  const evaluarSintomas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(dni) || !nombreCompleto) {
      toast.warning('Consulte y confirme primero un DNI válido.');
      return;
    }
    if (!edad || !peso || !altura || Number(edad) < 0 || Number(edad) > 120) {
      toast.warning('Ingrese una edad, peso y altura válidos.');
      return;
    }
    if (!sintomas.trim()) {
      toast.warning('Por favor, ingrese los síntomas del paciente.');
      return;
    }

    setCargando(true);
    setDiagnostico(null);
    setTriajeGuardado(false);

    try {
      const respuesta = await fetch('http://localhost:3000/api/triaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sintomas }),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => null);
        throw new Error(errorData?.error || `Error del servidor (${respuesta.status})`);
      }

      const data = await respuesta.json();
      setDiagnostico(data);
      if (data.urgencia === 'NULA') {
        setTriajeGuardado(false);
        toast.info('La evaluación tiene urgencia nula y no se guardará en el historial.');
      } else {
        await guardarTriaje(data);
        toast.success('Triaje evaluado y guardado automáticamente.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(
        error instanceof TypeError
          ? 'No se pudo conectar con el backend. Verifica que esté encendido.'
          : error instanceof Error
            ? error.message
            : 'No se pudo completar la evaluación de síntomas.'
      );
    } finally {
      setCargando(false);
    }
  };

  const consultarDni = async () => {
    if (!/^\d{8}$/.test(dni)) {
      toast.warning('El DNI debe contener exactamente 8 dígitos.');
      return;
    }

    setConsultandoDni(true);
    setNombreCompleto('');
    try {
      const respuesta = await fetch('http://localhost:3000/api/consultar-dni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni }),
      });
      const datos = await respuesta.json().catch(() => null);
      if (!respuesta.ok) throw new Error(datos?.error || 'No se pudo consultar el DNI.');
      setNombreCompleto(datos.nombreCompleto);
      toast.success('Datos del paciente encontrados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo consultar el DNI.');
    } finally {
      setConsultandoDni(false);
    }
  };

  const guardarTriaje = async (diagnosticoGenerado: DiagnosticoIA) => {
    setGuardando(true);

    try {
      const respuesta = await fetch('http://localhost:3000/api/triajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreCompleto,
          dni,
          edad: Number(edad),
          peso: Number(peso),
          altura: Number(altura),
          sintomas,
          ...diagnosticoGenerado,
        }),
      });
      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => null);
        throw new Error(errorData?.error || 'No se pudo guardar el triaje.');
      }

      setTriajeGuardado(true);
    } finally {
      setGuardando(false);
    }
  };

  const descargarReporte = () => {
    if (!diagnostico) return;
    descargarInformeTriaje({
      nombreCompleto,
      dni,
      edad: Number(edad),
      peso: Number(peso),
      altura: Number(altura),
      sintomas,
      ...diagnostico,
      creadoEn: new Date().toISOString(),
    });
  };

  const nuevoTriaje = () => {
    setNombreCompleto('');
    setDni('');
    setEdad('');
    setPeso('');
    setAltura('');
    setSintomas('');
    setDiagnostico(null);
    setTriajeGuardado(false);
    setGuardando(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main ref={containerRef} className="max-w-6xl mx-auto px-6 py-10">
      {/* Status Banner */}
      <div className="gsap-card bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl shadow-lg shadow-emerald-900/5 mb-8 flex items-center justify-between transition-colors duration-300">
        <div>
          <h2 className="text-green-800 dark:text-green-400 font-semibold">Sistema Operativo</h2>
          <p className="text-green-700 dark:text-green-500 text-sm">
            Conectado exitosamente al Backend y Motor Gemini IA
          </p>
        </div>
        <div className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta 1: Motor de IA */}
        <div className="gsap-card bg-white/90 dark:bg-slate-900/90 backdrop-blur dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/5 border border-white p-6 flex flex-col transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-100">Pre-Triaje Automatizado</h3>
              <p className="text-slate-500 text-xs">Evaluación asistida por Gemini IA</p>
            </div>
          </div>
          <form onSubmit={evaluarSintomas} className="flex flex-col grow">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label htmlFor="dni" className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 block">DNI</label>
                <div className="flex gap-2">
                  <input
                    id="dni"
                    inputMode="numeric"
                    maxLength={8}
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value.replace(/\D/g, ''));
                      setNombreCompleto('');
                    }}
                    required
                    className="min-w-0 flex-1 bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={consultarDni}
                    disabled={consultandoDni || dni.length !== 8}
                    className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    {consultandoDni ? 'Consultando...' : 'Aceptar'}
                  </button>
                </div>
                {nombreCompleto && (
                  <div className="mt-3 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 p-3" aria-live="polite">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Paciente encontrado</p>
                    <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">{nombreCompleto}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Información de una fuente pública externa; verifique los datos antes de continuar.</p>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="edad" className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 block">Edad</label>
                <input
                  id="edad"
                  type="number"
                  min="0"
                  max="120"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  required
                  className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="peso" className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 block">Peso (kg)</label>
                <input
                  id="peso"
                  type="number"
                  min="1"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  required
                  className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="altura" className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 block">Altura (cm)</label>
                <input
                  id="altura"
                  type="number"
                  min="30"
                  max="250"
                  step="0.1"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  required
                  className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <label htmlFor="sintomas" className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Describa los síntomas del paciente:
            </label>
            <textarea
              id="sintomas"
              rows={4}
              value={sintomas}
              onChange={(e) => setSintomas(e.target.value)}
              className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 resize-none transition-all duration-300"
            />
            <button
              type="submit"
              disabled={cargando}
              className={`w-full text-white font-semibold py-3 px-4 rounded-xl shadow-lg mt-auto transition-all duration-300 ${cargando ? 'bg-teal-400 cursor-not-allowed scale-95' : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-600/20 active:scale-95'}`}
            >
              {cargando ? 'Analizando con Inteligencia Artificial...' : 'Evaluar Síntomas'}
            </button>
          </form>
        </div>

        {/* Tarjeta 2: Resultados */}
        <div className="flex flex-col gap-6">
          {diagnostico && (
            <div
              ref={resultadoRef}
              className="bg-white/95 dark:bg-slate-900 rounded-2xl shadow-xl border border-white dark:border-slate-800 p-6 shadow-teal-900/10"
            >
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-100 border-b dark:border-slate-700 pb-2 mb-4">
                Resultado del Triaje
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <span className="text-slate-500 font-medium">Nivel de Urgencia:</span>
                  <span
                    className={`font-bold px-2 py-1 rounded-md text-xs ${diagnostico.urgencia === 'ALTA' ? 'bg-red-100 text-red-700' : diagnostico.urgencia === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : diagnostico.urgencia === 'BAJA' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'}`}
                  >
                    {diagnostico.urgencia}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 font-medium">Especialidad Sugerida:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{diagnostico.especialidad}</span>
                </div>
                <div className="flex flex-col bg-slate-50 dark:bg-slate-800/70 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 font-medium mb-1">Recomendación Médica:</span>
                  <span className="text-slate-700 dark:text-slate-200 italic">"{diagnostico.recomendacion}"</span>
                </div>
                {diagnostico.urgencia === 'NULA' ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" aria-live="polite">
                    Evaluación informativa. No se guardó en el historial porque la urgencia es nula.
                  </div>
                ) : (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                      triajeGuardado
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                    aria-live="polite"
                  >
                    {guardando
                      ? 'Guardando triaje automáticamente...'
                      : triajeGuardado
                        ? 'Triaje guardado automáticamente'
                        : 'No se pudo guardar el triaje automáticamente'}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={descargarReporte}
                    className="w-full text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95"
                  >
                    Descargar reporte
                  </button>
                  <button
                    type="button"
                    onClick={nuevoTriaje}
                    className="w-full text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95"
                  >
                    Nuevo triaje
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="gsap-card bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 grow transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 transition-colors duration-300">
              Módulos del Sistema
            </h3>
            <ul className="space-y-4">
              <li className="flex items-center text-slate-700">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-3 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="text-sm font-bold">Motor de IA para síntomas (Completado)</span>
              </li>
              <li className="flex items-center text-slate-600">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-3"></span>
                <span className="text-sm font-medium">Receptor de datos IoT</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
};
