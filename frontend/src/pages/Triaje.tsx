import { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { toast } from 'sonner';

// Interfaz para TypeScript
interface DiagnosticoIA {
  urgencia: 'ALTA' | 'MEDIA' | 'BAJA';
  especialidad: string;
  recomendacion: string;
}

export const Triaje = () => {
  const [sintomas, setSintomas] = useState('');
  const [diagnostico, setDiagnostico] = useState<DiagnosticoIA | null>(null);
  const [cargando, setCargando] = useState(false);
  const [pacientesAtendidos, setPacientesAtendidos] = useState(13);

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
    if (!sintomas.trim()) {
      toast.warning('Por favor, ingrese los síntomas del paciente.');
      return;
    }

    setCargando(true);
    setDiagnostico(null);

    try {
      const respuesta = await fetch('http://localhost:3000/api/triaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sintomas }),
      });

      if (!respuesta.ok) throw new Error('Error en el servidor');

      const data = await respuesta.json();
      setDiagnostico(data);
      setPacientesAtendidos((prev) => prev + 1);

      toast.success('Diagnóstico generado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión. Verifica que el servidor backend esté encendido.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main ref={containerRef} className="max-w-5xl mx-auto px-6 py-10">
      {/* Status Banner */}
      <div className="gsap-card bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm mb-8 flex items-center justify-between transition-colors duration-300">
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
        <div className="gsap-card bg-white dark:bg-slate-900 dark:border-slate-800  rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col transition-transform hover:-translate-y-1 duration-300">
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
              <h3 className="text-lg font-bold text-slate-700">Pre-Triaje Automatizado</h3>
              <p className="text-slate-500 text-xs">
                Evaluaciones en sesión:{' '}
                <span className="font-bold text-blue-600">{pacientesAtendidos}</span>
              </p>
            </div>
          </div>
          <form onSubmit={evaluarSintomas} className="flex flex-col grow">
            <label htmlFor="sintomas" className="text-sm font-semibold text-slate-700 mb-2">
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
              className={`w-full text-white font-semibold py-3 px-4 rounded-lg shadow-sm mt-auto transition-all duration-300 ${cargando ? 'bg-blue-400 cursor-not-allowed scale-95' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
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
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 shadow-blue-100/50"
            >
              <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">
                Resultado del Triaje
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <span className="text-slate-500 font-medium">Nivel de Urgencia:</span>
                  <span
                    className={`font-bold px-2 py-1 rounded-md text-xs ${diagnostico.urgencia === 'ALTA' ? 'bg-red-100 text-red-700' : diagnostico.urgencia === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
                  >
                    {diagnostico.urgencia}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 font-medium">Especialidad Sugerida:</span>
                  <span className="font-semibold text-slate-800">{diagnostico.especialidad}</span>
                </div>
                <div className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-medium mb-1">Recomendación Médica:</span>
                  <span className="text-slate-700 italic">"{diagnostico.recomendacion}"</span>
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
