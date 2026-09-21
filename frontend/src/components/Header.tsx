import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Logo = () => <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M9 5V3h6v2M9 10h6M12 7v6M8 21v-4h8v4M7 14h2M15 14h2"/></svg>;
const PerfilIcono = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
const SalirIcono = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>;

export const Header = () => {
  const navigate = useNavigate();
  const perfilRef = useRef<HTMLDivElement>(null);
  const [oscuro, setOscuro] = useState(() => localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && matchMedia('(prefers-color-scheme: dark)').matches));
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', oscuro); localStorage.setItem('theme', oscuro ? 'dark' : 'light'); }, [oscuro]);
  useEffect(() => {
    if (!perfilAbierto) return;
    const cerrarFuera = (evento: PointerEvent) => { if (!perfilRef.current?.contains(evento.target as Node)) setPerfilAbierto(false); };
    const cerrarConEscape = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setPerfilAbierto(false); };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => { document.removeEventListener('pointerdown', cerrarFuera); document.removeEventListener('keydown', cerrarConEscape); };
  }, [perfilAbierto]);

  const cerrarSesion = () => {
    localStorage.removeItem('medisync_auth');
    setPerfilAbierto(false);
    navigate('/login', { replace: true });
  };

  const enlace = ({ isActive }: { isActive: boolean }) => `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-white text-teal-700 shadow-sm dark:bg-teal-600 dark:text-white' : 'text-white/90 hover:bg-white/10'}`;
  return <header className="sticky top-0 z-40 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 shadow-lg border-b border-white/10">
    <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Logo/>MediSync Perú</h1><p className="text-teal-50/80 text-sm mt-1">Gestión hospitalaria y pre-triaje automatizado</p></div>
      <div className="flex items-center gap-2"><nav className="flex gap-2"><NavLink to="/dashboard" className={enlace}>Inicio</NavLink><NavLink to="/triaje" className={enlace}>Triaje</NavLink></nav>
        <button onClick={() => setOscuro(!oscuro)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-300 border border-white/10" title="Alternar tema">{oscuro ? <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg> : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>}</button>
        <div ref={perfilRef} className="relative">
          <button type="button" onClick={() => setPerfilAbierto((abierto) => !abierto)} aria-expanded={perfilAbierto} aria-haspopup="menu" aria-label="Abrir menú de perfil" className={`flex h-10 w-10 items-center justify-center rounded-xl border text-white transition-all ${perfilAbierto ? 'border-white/60 bg-white/25 shadow-lg' : 'border-white/10 bg-white/10 hover:bg-white/20'}`}><PerfilIcono/></button>
          {perfilAbierto && <div role="menu" className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-gradient-to-br from-teal-50 to-cyan-50 px-4 py-4 dark:border-slate-700 dark:from-teal-950/60 dark:to-slate-900">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white shadow-md"><PerfilIcono/></span><div><p className="font-bold text-slate-800 dark:text-white">Administrador</p><p className="text-xs text-slate-500 dark:text-slate-400">Sesión de MediSync</p></div></div>
            </div>
            <div className="p-2"><button type="button" role="menuitem" onClick={cerrarSesion} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:bg-red-50 focus:outline-none dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"><SalirIcono/>Cerrar sesión</button></div>
          </div>}
        </div>
      </div></div>
  </header>;
};
