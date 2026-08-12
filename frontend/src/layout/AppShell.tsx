import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { recordVisit } from '../hooks/useAppUsage';

export const ROLE_LABELS: Record<string, string> = {
  SX_ADMIN: 'Administrador',
  SX_FINANCE: 'Financeiro',
  SX_PURCHASING: 'Compras',
  SX_SALES: 'Vendas',
  SX_PRODUCTION: 'Produção',
  SX_SYSTEM: 'Administração de Sistema',
  SX_SECURITY: 'Segurança & Compliance',
};

export default function AppShell() {
  const { user, apps, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/login') {
      recordVisit(location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar__row">
          <Link to="/" className="app-topbar__brand">
            <span className="app-topbar__logo">S</span>
            SYSVEX
          </Link>
          <div className="app-topbar__user">
            {user && (
              <Link to="/account" style={{ color: '#fff', textDecoration: 'none' }}>
                {user.fullName} · {ROLE_LABELS[user.role] ?? user.role}
              </Link>
            )}
            <button className="app-topbar__logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
        {apps.length > 0 && (
          <nav className="app-topbar__tabs">
            {apps.map((app) => (
              <Link
                key={app.key}
                className="app-topbar__tab"
                to={{ pathname: '/', hash: app.key }}
              >
                {app.title}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
