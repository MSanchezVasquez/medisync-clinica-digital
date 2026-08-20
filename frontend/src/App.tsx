import { useState } from 'react';

function App() {
  const [pacientesAtendidos, setPacientesAtendidos] = useState(12);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
      {/* Header */}
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
              Versión 1.0 - Staging
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Status Banner */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-green-800 font-semibold">Sistema Operativo</h2>
            <p className="text-green-700 text-sm">Conectado exitosamente al Pipeline CI/CD</p>
          </div>
          <div className="animate-pulse h-3 w-3 bg-green-500 rounded-full"></div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Monitor de IA */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 duration-300">
            <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700">Pre-Triaje Automatizado</h3>
            <p className="text-slate-500 text-sm mt-2 mb-6">
              Pacientes evaluados por la IA en la sesión actual.
            </p>

            <div className="text-5xl font-black text-blue-600 mb-6">{pacientesAtendidos}</div>

            <button
              onClick={() => setPacientesAtendidos((prev) => prev + 1)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Simular Ingreso de Paciente
            </button>
          </div>

          {/* Card: Próximos Módulos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-700 mb-4 border-b pb-2">
              Módulos en Desarrollo
            </h3>
            <ul className="space-y-4">
              <li className="flex items-center text-slate-600">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-3"></span>
                <span className="text-sm font-medium">
                  Motor de IA para síntomas (Próximamente)
                </span>
              </li>
              <li className="flex items-center text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-300 mr-3"></span>
                <span className="text-sm font-medium">Receptor de datos IoT</span>
              </li>
              <li className="flex items-center text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-300 mr-3"></span>
                <span className="text-sm font-medium">Visor 3D de anatomía (AR)</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
