export const Header = () => (
  <header className="bg-blue-600 shadow-md">
    <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-3xl">🏥</span> MediSync Perú
        </h1>
        <p className="text-blue-100 text-sm mt-1">
          Plataforma Digital de Gestión Hospitalaria y Pre-Triaje
        </p>
      </div>
      <div className="hidden sm:block">
        <span className="bg-blue-800 text-blue-100 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500">
          Versión 1.1 - IA Integrada
        </span>
      </div>
    </div>
  </header>
);
