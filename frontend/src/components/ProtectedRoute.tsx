import { Navigate, Outlet } from 'react-router-dom';
import { Header } from './Header';

export const ProtectedRoute = () => {
  const token = localStorage.getItem('medisync_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header />
      <Outlet />
    </div>
  );
};
