export const Perfil = () => {
  const rawUser = localStorage.getItem('medisync_user');
  const usuario = rawUser ? JSON.parse(rawUser) : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil Institucional</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Información de credenciales y datos de sesión en MediSync Perú.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-bold text-3xl shadow-md">
            {usuario?.nombre ? usuario.nombre.slice(0, 2).toUpperCase() : 'AG'}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">{usuario?.nombre || 'Administrador General'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {usuario?.email || 'admin@medisync.pe'}
            </p>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 px-3 py-1 rounded-full">
                {usuario?.rol || 'ADMIN'}
              </span>
              {usuario?.cmp && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                  CMP: {usuario.cmp}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Nombre Completo
            </label>
            <input
              type="text"
              disabled
              value={usuario?.nombre || 'Administrador General'}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Correo Electrónico
            </label>
            <input
              type="text"
              disabled
              value={usuario?.email || 'admin@medisync.pe'}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>
      </div>
    </main>
  );
};
