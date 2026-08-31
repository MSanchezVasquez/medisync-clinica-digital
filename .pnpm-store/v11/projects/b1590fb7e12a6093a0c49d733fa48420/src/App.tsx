import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Header } from './components/Header';
import { Triaje } from './pages/Triaje';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// Pequeño componente para ocultar el Header en la ruta de Login
const LayoutConHeader = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const esconderHeader = location.pathname === '/login';

  return (
    <>
      {!esconderHeader && <Header />}
      {children}
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ecfeff_0,_#f8fafc_34%,_#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_top_left,_#134e4a_0,_#0f172a_28%,_#020617_100%)] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
        <Toaster richColors position="top-right" />

        <LayoutConHeader>
          <Routes>
            {/* Ahora la ruta inicial es el Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/triaje" element={<Triaje />} />
          </Routes>
        </LayoutConHeader>
      </div>
    </BrowserRouter>
  );
}

export default App;
