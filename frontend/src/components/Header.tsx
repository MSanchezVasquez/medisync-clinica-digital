import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { Link } from 'react-router-dom';

const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cierra el menú si se hace clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          MS
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                Moises Sanchez
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Administrador del Sistema
              </p>
            </div>

            <div className="py-1">
              <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                <span>👤</span> Mi Perfil
              </button>
              <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                <span>⚙️</span> Configuración
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
              <button className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2">
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
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Lado izquierdo: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">+</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">MediSync Perú</h1>
          </div>

          {/* Lado derecho: Navegación y Acciones */}
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-4 mr-2">
              <Link
                to="/"
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
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};
