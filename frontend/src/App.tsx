import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Triaje } from './pages/Triaje';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200">
        <Header />
        <Routes>
          <Route path="/" element={<Navigate to="/triaje" replace />} />
          <Route path="/triaje" element={<Triaje />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
