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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300 px-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors duration-300">
        {/* Encabezado del Formulario */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <span className="text-3xl">🏥</span>
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200"
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
