import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Triaje } from './pages/Triaje';
import { Perfil } from './pages/Profile';
import { ProtectedRoute } from './components/ProtectedRoute';

const UciVirtual = lazy(() => import('./pages/UciVirtual'));

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas clínicas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/triaje" element={<Triaje />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route
            path="/uci-virtual"
            element={
              <Suspense fallback={<p role="status" className="p-8">Cargando UCI virtual…</p>}>
                <UciVirtual />
              </Suspense>
            }
          />
        </Route>

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
