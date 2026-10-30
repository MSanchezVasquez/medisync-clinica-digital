import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { ModalGestionUsuarios } from './ModalGestionUsuarios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  cmp?: string;
}

interface ProfileDropdownProps {
  onAbrirGestionUsuarios: () => void;
}

const ProfileDropdown = ({ onAbrirGestionUsuarios }: ProfileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const usuario: UsuarioSesion | null = useMemo(() => {
    try {
      const raw = localStorage.getItem('medisync_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const iniciales = useMemo(() => {
    if (!usuario?.nombre) return 'MS';
    const partes = usuario.nombre.trim().split(/\s+/);
    if (partes.length >= 2 && partes[0] && partes[1]) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return usuario.nombre.slice(0, 2).toUpperCase();
  }, [usuario]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('medisync_token');
    localStorage.removeItem('medisync_user');
    setIsOpen(false);
    toast.info('Sesión cerrada correctamente.');
    navigate('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de perfil sin sombras ni efectos exagerados al hacer click */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-0.5 rounded-full focus:outline-none cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
          {iniciales}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-68 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {usuario?.nombre || 'Personal Médico'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {usuario?.email || 'Sin correo asignado'}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 px-2 py-0.5 rounded-full">
                  {usuario?.rol || 'MEDICO'}
                </span>
                {usuario?.cmp && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    CMP: {usuario.cmp}
                  </span>
                )}
              </div>
            </div>

            {usuario?.rol === 'ADMIN' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onAbrirGestionUsuarios();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center gap-2.5 cursor-pointer font-semibold transition-colors border-b border-slate-100 dark:border-slate-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  >
                    <circle cx="5.25" cy="6.25" r="2.25" />
                    <path d="M3.5 14H7a.75.75 0 0 0 .75-.75c0-1.9-1.1-3-2.5-3s-2.5 1.1-2.5 3a.75.75 0 0 0 .75.75" />
                    <circle cx="18.75" cy="6.25" r="2.25" />
                    <path d="M17 14h3.5a.75.75 0 0 0 .75-.75c0-1.9-1.1-3-2.5-3s-2.5 1.1-2.5 3A.75.75 0 0 0 17 14" />
                    <circle cx="12" cy="11.5" r="2" />
                    <path d="M6.75 21.25h10.5a.75.75 0 0 0 .75-.75c0-2.9-2.6-4.75-6-4.75S6 17.6 6 20.5a.75.75 0 0 0 .75.75" />
                  </g>
                </svg>
                Gestión Personal
              </button>
            )}

            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  toast.info('Vista de perfil institucional en desarrollo.');
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <g fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path
                      strokeLinejoin="round"
                      d="M4 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                    />
                    <circle cx="12" cy="7" r="3" />
                  </g>
                </svg>
                Mi Perfil
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path
                    fill="currentColor"
                    d="M12 18.25a.75.75 0 0 0 0 1.5h6A1.75 1.75 0 0 0 19.75 18V6A1.75 1.75 0 0 0 18 4.25h-6a.75.75 0 0 0 0 1.5h6a.25.25 0 0 1 .25.25v12a.25.25 0 0 1-.25.25z"
                  />
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M14.503 14.365c.69 0 1.25-.56 1.25-1.25v-2.24c0-.69-.56-1.25-1.25-1.25H9.89l-.02-.22l-.054-.556a1.227 1.227 0 0 0-1.751-.988a15 15 0 0 0-4.368 3.164l-.099.103a1.253 1.253 0 0 0 0 1.734l.1.103a15 15 0 0 0 4.367 3.164a1.227 1.227 0 0 0 1.751-.988l.054-.556l.02-.22zm-5.308-1.5a.75.75 0 0 0-.748.704q-.028.435-.07.871l-.016.162a13.6 13.6 0 0 1-3.516-2.607a13.6 13.6 0 0 1 3.516-2.607l.016.162q.042.435.07.871a.75.75 0 0 0 .748.704h5.058v1.74z"
                    clipRule="evenodd"
                  />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Header = () => {
  const [modalUsuariosAbierto, setModalUsuariosAbierto] = useState(false);
  const location = useLocation();

  const esRutaActiva = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Brand / Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-teal-600 group-hover:bg-teal-500 rounded-xl flex items-center justify-center shadow-md transition-colors">
              <span className="text-white font-bold text-2xl leading-none">+</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                MediSync{' '}
                <span className="text-teal-600 dark:text-teal-400 font-semibold text-lg">Perú</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1 hidden sm:block">
                Sistema de Triaje & Telemetría UCI
              </p>
            </div>
          </Link>

          {/* Navegación Principal y Acciones */}
          <div className="flex items-center gap-5">
            <nav className="flex items-center gap-2">
              {/* Botón Inicio */}
              <Link
                to="/dashboard"
                className={`text-sm font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  esRutaActiva('/dashboard')
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 ring-2 ring-teal-600/40 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.1em"
                  height="1.1em"
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 19v-6.733a4 4 0 0 0-1.245-2.9L13.378 3.31a2 2 0 0 0-2.755 0L4.245 9.367A4 4 0 0 0 3 12.267V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2"
                  />
                </svg>
                Inicio
              </Link>

              {/* Botón Triaje */}
              <Link
                to="/triaje"
                className={`text-sm font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                  esRutaActiva('/triaje')
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 ring-2 ring-teal-600/40 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.1em"
                  height="1.1em"
                  viewBox="0 0 32 32"
                >
                  <path d="M0 0h32v32H0z" fill="none" />
                  <path
                    fill="currentColor"
                    d="M27 12v2h1v4a3 3 0 0 1-6 0v-4h1v-2h-3v6a5.01 5.01 0 0 0 4 4.899V24a4 4 0 0 1-8 0v-2.184a3 3 0 1 0-2 0V24a6 6 0 0 0 12 0v-1.101A5.01 5.01 0 0 0 30 18v-6Zm-12 6a1 1 0 1 1-1 1a1 1 0 0 1 1-1"
                  />
                  <path
                    fill="currentColor"
                    d="M26 4h-4V2h-2v2h-8V2h-2v2H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h4v-2H6V6h4v2h2V6h8v2h2V6h4v4h2V6a2 2 0 0 0-2-2"
                  />
                </svg>
                Triaje
              </Link>
            </nav>

            <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              {/* Botón de Notificaciones */}
              <button
                type="button"
                onClick={() => toast.info('No hay alertas críticas pendientes.')}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative cursor-pointer"
                title="Alertas del sistema"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.3em"
                  height="1.3em"
                  viewBox="0 0 24 24"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  >
                    <path d="M3 12c0-4.243 0-6.364 1.318-7.682S7.758 3 12 3s6.364 0 7.682 1.318S21 7.758 21 12s0 6.364-1.318 7.682S16.242 21 12 21s-6.364 0-7.682-1.318S3 16.242 3 12" />
                    <path d="M7.375 8H7.25m.125 4H7.25m.125 4H7.25m.25-8A.25.25 0 1 1 7 8a.25.25 0 0 1 .5 0m0 4a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m0 4a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0M11 8h6m-6 4h6m-6 4h6" />
                  </g>
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
              </button>

              <ThemeToggle />
              <ProfileDropdown onAbrirGestionUsuarios={() => setModalUsuariosAbierto(true)} />
            </div>
          </div>
        </div>
      </div>

      <ModalGestionUsuarios
        abierto={modalUsuariosAbierto}
        alCerrar={() => setModalUsuariosAbierto(false)}
      />
    </header>
  );
};
