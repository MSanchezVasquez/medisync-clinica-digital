import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const PerfilIcono = () => <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
const SalirIcono = () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 17 5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>;

export const Header = () => {
  const navigate = useNavigate();
  const perfilRef = useRef<HTMLDivElement>(null);
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  useEffect(() => {
    if (!perfilAbierto) return;
    const cerrarFuera = (evento: PointerEvent) => {
      if (!perfilRef.current?.contains(evento.target as Node)) setPerfilAbierto(false);
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setPerfilAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [perfilAbierto]);

  const cerrarSesion = () => {
    localStorage.removeItem('medisync_auth');
    localStorage.removeItem('userToken');
    setPerfilAbierto(false);
    navigate('/login', { replace: true });
  };

  const enlace = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-teal-50 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200' : 'text-slate-600 hover:bg-slate-100 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-teal-300'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-800 dark:text-white">MediSync Perú</h1>
            <p className="hidden text-xs text-slate-500 sm:block">Gestión hospitalaria y pre-triaje automatizado</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <nav aria-label="Navegación principal" className="flex items-center gap-1">
            <NavLink to="/dashboard" className={enlace}>Inicio</NavLink>
            <NavLink to="/triaje" className={enlace}>Triaje</NavLink>
          </nav>
          <ThemeToggle />
          <div ref={perfilRef} className="relative">
            <button
              type="button"
              onClick={() => setPerfilAbierto((abierto) => !abierto)}
              aria-expanded={perfilAbierto}
              aria-haspopup="menu"
              aria-label="Abrir menú de perfil"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${perfilAbierto ? 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-200' : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              <PerfilIcono />
            </button>
            {perfilAbierto && (
              <div role="menu" className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-200 bg-teal-50 px-4 py-4 dark:border-slate-700 dark:bg-teal-950/40">
                  <p className="font-bold text-slate-800 dark:text-white">Administrador</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sesión de MediSync</p>
                </div>
                <div className="p-2">
                  <button type="button" role="menuitem" onClick={cerrarSesion} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:bg-red-50 focus:outline-none dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40">
                    <SalirIcono />Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
