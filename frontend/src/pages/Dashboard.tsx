export const Dashboard = () => {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
        Panel de Control Principal
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Tarjetas de métricas rápidas */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pacientes Hoy</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">14</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Urgencias Altas
          </h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-500 mt-2">2</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Estado de IA</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">Activo</p>
        </div>
      </div>
    </main>
  );
};
