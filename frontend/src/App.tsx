import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Header } from './components/Header';
import { Triaje } from './pages/Triaje';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors duration-300">
        <Header />
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/triaje" replace />} />
          <Route path="/triaje" element={<Triaje />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
