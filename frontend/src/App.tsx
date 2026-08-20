import { useState } from 'react';

interface DiagnosticoIA {
  urgencia: 'ALTA' | 'MEDIA' | 'BAJA';
  especialidad: string;
  recomendacion: string;
}

// ==========================================
// COMPONENTES DE INTERFAZ (UI)
// ==========================================

const Header = () => (
  <header className="bg-blue-600 shadow-md">
    <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-3xl">🏥</span> MediSync Perú
        </h1>
        <p className="text-blue-100 text-sm mt-1">
          Plataforma Digital de Gestión Hospitalaria y Pre-Triaje
        </p>
      </div>
      <div className="hidden sm:block">
        <span className="bg-blue-800 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500">
          Versión 1.1 - IA Integrada
        </span>
      </div>
    </div>
  </header>
);

const StatusBanner = () => (
  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm mb-8 flex items-center justify-between">
    <div>
      <h2 className="text-green-800 font-semibold">Sistema Operativo</h2>
      <p className="text-green-700 text-sm">Conectado exitosamente al Backend y Motor Gemini IA</p>
    </div>
    <div className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></div>
  </div>
);

// ==========================================
// COMPONENTE PRINCIPAL (LÓGICA)
// ==========================================

function App() {
  // Estados para manejar el formulario y la respuesta de la IA
  const [sintomas, setSintomas] = useState('');
  const [diagnostico, setDiagnostico] = useState<DiagnosticoIA | null>(null);
  const [cargando, setCargando] = useState(false);
  const [pacientesAtendidos, setPacientesAtendidos] = useState(12); // Tu contador original

  // Función que se comunica con el servidor Express
  const evaluarSintomas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sintomas.trim()) return;

    setCargando(true);
    setDiagnostico(null);

    try {
      const respuesta = await fetch('http://localhost:3000/api/triaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sintomas }),
      });

      const data = await respuesta.json();
      setDiagnostico(data);
      setPacientesAtendidos((prev) => prev + 1); // Sumamos 1 paciente atendido
    } catch (error) {
      console.error('Error de conexión con el backend:', error);
      alert('Hubo un error al conectar con el servidor de MediSync.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <StatusBanner />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TARJETA 1: El Motor de IA (Refactorizado) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col transition-transform hover:-translate-y-1 duration-300">
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

            {/* Formulario */}
            <form onSubmit={evaluarSintomas} className="flex flex-col flex-grow">
              <label htmlFor="sintomas" className="text-sm font-semibold text-slate-700 mb-2">
                Describa los síntomas del paciente:
              </label>
              <textarea
                id="sintomas"
                rows={4}
                value={sintomas}
                onChange={(e) => setSintomas(e.target.value)}
                placeholder="Ej. Dolor agudo en el pecho, sudoración y dificultad para respirar..."
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 resize-none"
                required
              />
              <button
                type="submit"
                disabled={cargando}
                className={`w-full text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-auto
                  ${cargando ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {cargando ? 'Analizando con Inteligencia Artificial...' : 'Evaluar Síntomas'}
              </button>
            </form>
          </div>

          {/* TARJETA 2: Resultados y Próximos Módulos */}
          <div className="flex flex-col gap-6">
            {/* Resultados del Triaje (Se muestra solo si hay diagnóstico) */}
            {diagnostico && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">
                  Resultado del Triaje
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 font-medium">Nivel de Urgencia:</span>
                    <span
                      className={`font-bold px-2 py-1 rounded-md text-xs 
                      ${
                        diagnostico.urgencia === 'ALTA'
                          ? 'bg-red-100 text-red-700'
                          : diagnostico.urgencia === 'MEDIA'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                      }`}
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

            {/* Módulos en Desarrollo (Actualizado) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-grow">
              <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">
                Módulos del Sistema
              </h3>
              <ul className="space-y-4">
                <li className="flex items-center text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-3 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                  <span className="text-sm font-bold">Motor de IA para síntomas (Completado)</span>
                </li>
                <li className="flex items-center text-slate-400 line-through">
                  <span className="w-2 h-2 rounded-full bg-slate-300 mr-3"></span>
                  <span className="text-sm">Configuración de ESLint y Prettier</span>
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
    </div>
  );
}

export default App;
