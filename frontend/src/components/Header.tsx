import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

const Logo = () => <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M9 5V3h6v2M9 10h6M12 7v6M8 21v-4h8v4M7 14h2M15 14h2"/></svg>;

export const Header = () => {
  const [oscuro, setOscuro] = useState(() => localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && matchMedia('(prefers-color-scheme: dark)').matches));
  useEffect(() => { document.documentElement.classList.toggle('dark', oscuro); localStorage.setItem('theme', oscuro ? 'dark' : 'light'); }, [oscuro]);
  const enlace = ({ isActive }: { isActive: boolean }) => `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-white text-teal-700 shadow-sm dark:bg-teal-600 dark:text-white' : 'text-white/90 hover:bg-white/10'}`;
  return <header className="sticky top-0 z-40 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-600 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 shadow-lg border-b border-white/10">
    <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Logo/>MediSync Perú</h1><p className="text-teal-50/80 text-sm mt-1">Gestión hospitalaria y pre-triaje automatizado</p></div>
      <div className="flex items-center gap-2"><nav className="flex gap-2"><NavLink to="/dashboard" className={enlace}>Inicio</NavLink><NavLink to="/triaje" className={enlace}>Triaje</NavLink></nav>
        <button onClick={() => setOscuro(!oscuro)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-yellow-300 border border-white/10" title="Alternar tema">{oscuro ? <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg> : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>}</button>
      </div></div>
  </header>;
};
