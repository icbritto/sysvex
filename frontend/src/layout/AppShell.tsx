import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { recordVisit } from '../hooks/useAppUsage';
import { LAUNCHPAD_GROUPS, GroupTile } from '../launchpadGroups';

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

  const [openTabKey, setOpenTabKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/login') {
      recordVisit(location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    setOpenTabKey(null);
    setSearchOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenTabKey(null);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tilesByGroupKey = useMemo(() => {
    const map = new Map<string, GroupTile[]>();
    LAUNCHPAD_GROUPS.forEach((group) => map.set(group.key, group.tiles));
    return map;
  }, []);

  const visibleKeys = useMemo(() => new Set(apps.map((app) => app.key)), [apps]);

  const searchableTiles = useMemo(() => {
    return LAUNCHPAD_GROUPS.filter((group) => visibleKeys.has(group.key)).flatMap((group) =>
      group.tiles.map((tile) => ({ ...tile, groupTitle: group.title, groupColor: group.color })),
    );
  }, [visibleKeys]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return searchableTiles
      .filter((tile) => tile.title.toLowerCase().includes(query) || tile.groupTitle.toLowerCase().includes(query))
      .slice(0, 8);
  }, [searchQuery, searchableTiles]);

  const goTo = (to: string) => {
    navigate(to);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      goTo(searchResults[0].to);
    }
  };

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

          <div className="app-topbar__search" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <span className="app-topbar__search-icon">🔍</span>
              <input
                type="search"
                placeholder="Buscar um processo ou página…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
              />
            </form>
            {searchOpen && searchQuery.trim() !== '' && (
              <div className="app-topbar__search-results">
                {searchResults.length === 0 ? (
                  <div className="app-topbar__search-empty">Nenhum resultado para "{searchQuery}".</div>
                ) : (
                  searchResults.map((tile) => (
                    <button
                      type="button"
                      key={tile.to}
                      className="app-topbar__search-result"
                      onClick={() => goTo(tile.to)}
                    >
                      <span className="app-topbar__search-result-icon" style={{ background: tile.groupColor }}>
                        {tile.icon}
                      </span>
                      <span>
                        <span className="app-topbar__search-result-title">{tile.title}</span>
                        <span className="app-topbar__search-result-group">{tile.groupTitle}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

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
          <nav className="app-topbar__tabs" ref={navRef}>
            {apps.map((app) => {
              const tiles = tilesByGroupKey.get(app.key) ?? [];
              const isOpen = openTabKey === app.key;
              return (
                <div className="app-topbar__tab-wrap" key={app.key}>
                  <button
                    type="button"
                    className={`app-topbar__tab ${isOpen ? 'app-topbar__tab--open' : ''}`}
                    onClick={() => setOpenTabKey(isOpen ? null : app.key)}
                  >
                    {app.title}
                    {tiles.length > 0 && <span className="app-topbar__tab-caret">▾</span>}
                  </button>
                  {isOpen && tiles.length > 0 && (
                    <div className="app-topbar__dropdown">
                      <Link
                        className="app-topbar__dropdown-item app-topbar__dropdown-item--all"
                        to={{ pathname: '/', hash: app.key }}
                        onClick={() => setOpenTabKey(null)}
                      >
                        Ver tudo em {app.title}
                      </Link>
                      {tiles.map((tile) => (
                        <Link
                          key={tile.to}
                          className="app-topbar__dropdown-item"
                          to={tile.to}
                          onClick={() => setOpenTabKey(null)}
                        >
                          <span>{tile.icon}</span> {tile.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
