import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  FINANCE: 'Financeiro',
  PURCHASING: 'Compras',
  SALES: 'Vendas',
  PRODUCTION: 'Produção',
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/" className="app-topbar__brand">
          <span className="app-topbar__logo">S</span>
          SYSVEX
        </Link>
        <div className="app-topbar__user">
          {user && (
            <span>
              {user.fullName} · {ROLE_LABELS[user.role] ?? user.role}
            </span>
          )}
          <button className="app-topbar__logout" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
