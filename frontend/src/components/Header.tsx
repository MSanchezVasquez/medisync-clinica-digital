import { useState, useEffect } from 'react';

export const Header = () => {
  // Estado para controlar el tema (lee la preferencia previa del usuario si existe)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      );
    }
    return false;
  });

  // Efecto que inyecta la clase 'dark' en el HTML general cuando cambia el estado
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="bg-blue-600 dark:bg-slate-900 shadow-md transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-3xl">🏥</span> MediSync Perú
          </h1>
          <p className="text-blue-100 dark:text-slate-400 text-sm mt-1">
            Plataforma Digital de Gestión Hospitalaria y Pre-Triaje
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <span className="bg-blue-800 dark:bg-slate-800 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500 dark:border-slate-700">
              Versión 1.1 - IA Integrada
            </span>
          </div>

          {/* Botón de Modo Oscuro */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-blue-700 hover:bg-blue-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-yellow-300 transition-colors duration-300 shadow-sm"
            title="Alternar tema"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
};
