import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const Login = () => {
  const [credenciales, setCredenciales] = useState({ email: '', password: '' });
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credenciales),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Credenciales inválidas.');
        return;
      }

      // Persistencia del token JWT y datos de sesión
      localStorage.setItem('medisync_token', data.token);
      localStorage.setItem('medisync_user', JSON.stringify(data.usuario));

      toast.success(`Bienvenido, ${data.usuario.nombre}`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error de conexión:', error);
      toast.error('No se pudo conectar con el servidor clínico.');
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredenciales({
      ...credenciales,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-r from-teal-50 via-white to-cyan-100 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 px-6">
      <div className="max-w-md w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-3xl shadow-2xl border border-white dark:border-slate-800 p-8">
        {/* Encabezado del Formulario */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30 mb-4">
            <svg
              className="w-9 h-9 text-teal-700 dark:text-teal-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 21V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
              <path d="M9 5V3h6v2M9 10h6M12 7v6M8 21v-4h8v4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Acceso Médico</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Ingrese sus credenciales institucionales para acceder
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Correo Institucional
            </label>
            <input
              type="email"
              name="email"
              value={credenciales.email}
              onChange={handleChange}
              disabled={cargando}
              className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-300 disabled:opacity-50"
              placeholder="admin@medisync.pe"
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
              disabled={cargando}
              className="w-full bg-transparent border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors duration-300 disabled:opacity-50"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-linear-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {cargando ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Validando credenciales...</span>
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          *Sistema de uso exclusivo para personal médico autorizado
        </div>
      </div>
    </div>
  );
};
