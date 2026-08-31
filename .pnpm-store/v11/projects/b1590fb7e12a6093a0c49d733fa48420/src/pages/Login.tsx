import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const Login = () => {
  const [credenciales, setCredenciales] = useState({ usuario: '', password: '' });
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Simulación de validación de backend
    if (credenciales.usuario === 'admin' && credenciales.password === '1234') {
      // Persistencia local para mantener la sesión activa
      localStorage.setItem('medisync_auth', 'true');
      toast.success('Sesión iniciada correctamente');
      navigate('/dashboard'); // Redirigimos al dashboard tras el éxito
    } else {
      toast.error('Credenciales incorrectas. Intente de nuevo.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredenciales({
      ...credenciales,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-100 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 transition-colors duration-300 px-6">
      <div className="max-w-md w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-teal-900/10 border border-white dark:border-slate-800 p-8 transition-colors duration-300">
        {/* Encabezado del Formulario */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/30 mb-4 shadow-inner">
            <svg className="w-9 h-9 text-teal-700 dark:text-teal-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
              <path d="M9 5V3h6v2M9 10h6M12 7v6M8 21v-4h8v4M7 14h2M15 14h2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Acceso Médico</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Ingrese sus credenciales para acceder a MediSync
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Usuario
            </label>
            <input
              type="text"
              name="usuario"
              value={credenciales.usuario}
              onChange={handleChange}
              className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
              placeholder="Ej. admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={credenciales.password}
              onChange={handleChange}
              className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-teal-600/20 transition-all duration-200 active:scale-[0.98]"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          *Para pruebas use: admin / 1234
        </div>
      </div>
    </div>
  );
};
