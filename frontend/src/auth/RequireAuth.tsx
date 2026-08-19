import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Spinner from '../components/Spinner';

export default function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state loading-state--fullpage">
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
