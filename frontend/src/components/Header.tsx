import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { ModalGestionUsuarios } from './ModalGestionUsuarios';
import { Link, useNavigate } from 'react-router-dom';
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
        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
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
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 px-2 py-0.5 rounded-full">
                  {usuario?.rol || 'MEDICO'}
                </span>
                {usuario?.cmp && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
                className="w-full text-left px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-semibold"
              >
                👥 Gestión de Personal
              </button>
            )}

            <div className="py-1">
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>👤</span> Mi Perfil
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>⚙️</span> Configuración
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

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">+</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">MediSync Perú</h1>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-4 mr-2">
              <Link
                to="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400 transition-colors"
              >
                Inicio
              </Link>
              <Link
                to="/triaje"
                className="text-sm font-medium bg-teal-600/10 text-teal-700 hover:bg-teal-600/20 dark:bg-teal-900/30 dark:text-teal-400 px-3 py-1 rounded-md transition-colors"
              >
                Triaje
              </Link>
            </nav>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

            <ThemeToggle />
            <ProfileDropdown onAbrirGestionUsuarios={() => setModalUsuariosAbierto(true)} />
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
