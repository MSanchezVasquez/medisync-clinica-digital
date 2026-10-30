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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-teal-500/20">
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
            className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
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
                className="w-full text-left px-4 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center gap-2 cursor-pointer font-semibold transition-colors border-b border-slate-100 dark:border-slate-800"
              >
                <span>👥</span> Gestión de Personal
              </button>
            )}

            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  toast.info('Vista de perfil institucional en desarrollo.');
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer font-medium"
              >
                <span>👤</span> Mi Perfil
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>🚪</span> Cerrar Sesión
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
        {/* Altura incrementada de h-16 a h-20 (80px) para un header más amplio */}
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
              <Link
                to="/dashboard"
                className={`text-sm font-semibold px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  esRutaActiva('/dashboard')
                    ? 'bg-slate-100 text-teal-700 dark:bg-slate-800 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <span>🏠</span> Inicio
              </Link>
              <Link
                to="/triaje"
                className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                  esRutaActiva('/triaje')
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-teal-600/10 text-teal-700 hover:bg-teal-600/20 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-900/50'
                }`}
              >
                <span>📋</span> Triaje
              </Link>
            </nav>

            <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              {/* Botón de Notificaciones Sanitaria (Adicional) */}
              <button
                type="button"
                onClick={() => toast.info('No hay alertas críticas pendientes.')}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative cursor-pointer"
                title="Alertas del sistema"
              >
                <span className="text-lg">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-teal-500 rounded-full"></span>
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
