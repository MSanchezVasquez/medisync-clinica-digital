import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertaMedica {
  id: string;
  tipo: 'CRITICO' | 'ADVERTENCIA' | 'INFO';
  titulo: string;
  mensaje: string;
  tiempo: string;
  leida: boolean;
}

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ejemplo de datos en tiempo real (puedes conectarlo a tu backend o estados de IoT)
  const [alertas, setAlertas] = useState<AlertaMedica[]>([
    {
      id: '1',
      tipo: 'CRITICO',
      titulo: 'Alerta IoT - Cama 4',
      mensaje: 'Frecuencia cardíaca elevada detectada (125 bpm).',
      tiempo: 'Hace 2 min',
      leida: false,
    },
    {
      id: '2',
      tipo: 'ADVERTENCIA',
      titulo: 'Nuevo Triaje Ingresado',
      mensaje: 'Paciente con síntomas de dolor agudo registrado.',
      tiempo: 'Hace 15 min',
      leida: false,
    },
  ]);

  const noLeidas = alertas.filter((a) => !a.leida).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const marcarComoLeidas = () => {
    setAlertas(alertas.map((a) => ({ ...a, leida: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón del ícono */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative cursor-pointer"
        title="Alertas del sistema"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="1.3em" height="1.3em" viewBox="0 0 24 24">
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
        {noLeidas > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Contenedor Desplegable */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Centro de Alertas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monitoreo de UCI y Triaje
                </p>
              </div>
              {noLeidas > 0 && (
                <button
                  onClick={marcarComoLeidas}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                >
                  Marcar leídas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {alertas.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  No hay notificaciones nuevas
                </div>
              ) : (
                alertas.map((alerta) => (
                  <div
                    key={alerta.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!alerta.leida ? 'bg-teal-50/30 dark:bg-teal-950/10' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          alerta.tipo === 'CRITICO'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {alerta.titulo}
                      </span>
                      <span className="text-[10px] text-slate-400">{alerta.tiempo}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                      {alerta.mensaje}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
