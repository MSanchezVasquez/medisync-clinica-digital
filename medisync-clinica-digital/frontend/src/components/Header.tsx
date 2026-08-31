import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

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
    <header className="sticky top-0 z-40 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 shadow-lg shadow-teal-950/10 border-b border-white/10 backdrop-blur transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
              <path d="M9 5V3h6v2M9 10h6M12 7v6M8 21v-4h8v4M7 14h2M15 14h2" />
            </svg>
            MediSync Perú
          </h1>
          <p className="text-blue-100 dark:text-slate-400 text-sm mt-1">
            Plataforma Digital de Gestión Hospitalaria y Pre-Triaje
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-2" aria-label="Navegación principal">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-teal-700 shadow-sm dark:bg-teal-600 dark:text-white'
                    : 'text-white/90 hover:bg-white/10'
                }`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/triaje"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-teal-700 shadow-sm dark:bg-teal-600 dark:text-white'
                    : 'text-white/90 hover:bg-white/10'
                }`
              }
            >
              Triaje
            </NavLink>
          </nav>
          <div className="hidden sm:block">
            <span className="bg-white/10 text-teal-50 text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
              Versión 1.1 - IA Integrada
            </span>
          </div>

          {/* Botón de Modo Oscuro */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-300 transition-colors duration-300 shadow-sm border border-white/10"
            title="Alternar tema"
          >
            {isDark ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
