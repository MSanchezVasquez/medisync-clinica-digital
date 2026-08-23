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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-300">
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
