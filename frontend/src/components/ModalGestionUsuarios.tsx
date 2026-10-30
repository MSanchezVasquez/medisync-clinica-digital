import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  cmp?: string | null;
  rol: 'ADMIN' | 'MEDICO' | 'ENFERMERO';
  activo: boolean;
  creadoEn: string;
  _count?: { triajes: number };
}

interface Props {
  abierto: boolean;
  alCerrar: () => void;
}

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:3000/api';

export const ModalGestionUsuarios = ({ abierto, alCerrar }: Props) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cmp, setCmp] = useState('');
  const [rol, setRol] = useState<'MEDICO' | 'ADMIN'>('MEDICO');

  const getHeaders = () => {
    const token = localStorage.getItem('medisync_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API}/usuarios`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Error al cargar la lista de personal.');
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!abierto) return;
    let montado = true;

    const cargarInicial = async () => {
      setCargando(true);
      try {
        const res = await fetch(`${API}/usuarios`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Error al cargar la lista de personal.');
        const data = await res.json();
        if (montado) setUsuarios(data);
      } catch (err) {
        if (montado) toast.error(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        if (montado) setCargando(false);
      }
    };

    void cargarInicial();

    return () => {
      montado = false;
    };
  }, [abierto]);

  const registrarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`${API}/usuarios`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          nombre,
          email,
          password,
          cmp: cmp.trim() || undefined,
          rol,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar usuario.');

      toast.success('Profesional registrado correctamente.');
      setNombre('');
      setEmail('');
      setPassword('');
      setCmp('');
      await cargarUsuarios();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id: string, nombreUsuario: string) => {
    try {
      const res = await fetch(`${API}/usuarios/${id}/estado`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar el estado.');

      toast.success(`Estado actualizado para ${nombreUsuario}.`);
      await cargarUsuarios();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado.');
    }
  };

  if (!abierto) return null;

  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

  // Usamos createPortal para renderizar el modal directamente en el body del documento
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Gestión de Personal Médico y Usuarios
            </h3>
            <p className="text-sm text-slate-500">
              Alta de facultativos, validación de CMP y control de acceso RBAC
            </p>
          </div>
          <button
            onClick={alCerrar}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-8">
          <h4 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-4">
            Registrar nuevo profesional
          </h4>
          <form
            onSubmit={registrarUsuario}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Nombre completo
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Dr. Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Correo institucional
              </label>
              <input
                type="email"
                required
                placeholder="dr.perez@medisync.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Contraseña provisional
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                N° CMP (Colegiatura)
              </label>
              <input
                type="text"
                placeholder="Ej. 084512"
                value={cmp}
                onChange={(e) => setCmp(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                Rol asignado
              </label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as 'MEDICO' | 'ADMIN')}
                className={inputClass}
              >
                <option value="MEDICO">Médico Asistencial</option>
                <option value="ADMIN">Administrador de Sistema</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : '+ Registrar Personal'}
              </button>
            </div>
          </form>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Personal activo y credenciales ({usuarios.length})
          </h4>
          {cargando ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Cargando datos del personal...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-2.5 px-3">Profesional</th>
                    <th className="py-2.5 px-3">CMP</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">Triajes</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{u.nombre}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-3 px-3">
                        {u.cmp ? (
                          <span className="font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {u.cmp}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            u.rol === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                          }`}
                        >
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                        {u._count?.triajes ?? 0}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${
                            u.activo ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-xs text-slate-500">
                          {u.activo ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => cambiarEstado(u.id, u.nombre)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            u.activo
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {u.activo ? 'Suspender' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
