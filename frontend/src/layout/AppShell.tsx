import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { recordVisit, useAppUsage } from '../hooks/useAppUsage';
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

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function AppShell() {
  const { user, apps, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useAppUsage();

  // Só um menu do topo fica aberto por vez: null | 'hamburger' | 'avatar' | 'search' | <key do App>
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/login') {
      recordVisit(location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    setActiveMenu(null);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleGroups = useMemo(() => {
    const visibleKeys = apps.map((app) => app.key);
    return LAUNCHPAD_GROUPS.filter((group) => visibleKeys.includes(group.key)).sort(
      (a, b) => visibleKeys.indexOf(a.key) - visibleKeys.indexOf(b.key),
    );
  }, [apps]);

  const tilesByGroupKey = useMemo(() => {
    const map = new Map<string, GroupTile[]>();
    visibleGroups.forEach((group) => map.set(group.key, group.tiles));
    return map;
  }, [visibleGroups]);

  const searchableTiles = useMemo(
    () => visibleGroups.flatMap((group) => group.tiles.map((tile) => ({ ...tile, groupTitle: group.title, groupColor: group.color }))),
    [visibleGroups],
  );

  const tileByPath = useMemo(() => {
    const map = new Map<string, (typeof searchableTiles)[number]>();
    searchableTiles.forEach((tile) => map.set(tile.to, tile));
    return map;
  }, [searchableTiles]);

  const favoriteTiles = favorites.map((path) => tileByPath.get(path)).filter((tile): tile is NonNullable<typeof tile> => !!tile);

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
    setActiveMenu(null);
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

  const toggleGroupExpanded = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="app-shell">
      <header className="app-topbar" ref={headerRef}>
        <div className="app-topbar__row">
          <div className="app-topbar__row-left">
            <div className="app-topbar__hamburger-wrap">
              <button
                type="button"
                className="app-topbar__hamburger"
                onClick={() => setActiveMenu(activeMenu === 'hamburger' ? null : 'hamburger')}
                aria-label="Menu de navegação"
              >
                ☰
              </button>
              {activeMenu === 'hamburger' && (
                <div className="app-topbar__hamburger-panel">
                  <Link to="/" className="app-topbar__hamburger-home" onClick={() => setActiveMenu(null)}>
                    <span>🏠</span> Página Inicial
                  </Link>

                  {favoriteTiles.length > 0 && (
                    <div className="app-topbar__hamburger-section">
                      <div className="app-topbar__hamburger-section-title">Favoritos</div>
                      {favoriteTiles.map((tile) => (
                        <Link
                          key={tile.to}
                          to={tile.to}
                          className="app-topbar__hamburger-leaf"
                          onClick={() => setActiveMenu(null)}
                        >
                          <span>{tile.icon}</span> {tile.title}
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="app-topbar__hamburger-section">
                    <div className="app-topbar__hamburger-section-title">Linhas de Negócio</div>
                    {visibleGroups.map((group) => {
                      const expanded = expandedGroups.has(group.key);
                      return (
                        <div key={group.key}>
                          <div className="app-topbar__hamburger-branch-row">
                            <Link
                              to={`/lines/${group.key}`}
                              className="app-topbar__hamburger-branch"
                              onClick={() => setActiveMenu(null)}
                            >
                              {group.title}
                            </Link>
                            <button
                              type="button"
                              className="app-topbar__hamburger-branch-toggle"
                              onClick={() => toggleGroupExpanded(group.key)}
                              aria-label={`Mostrar processos de ${group.title}`}
                            >
                              <span
                                className={`app-topbar__hamburger-caret ${expanded ? 'app-topbar__hamburger-caret--open' : ''}`}
                              >
                                ▸
                              </span>
                            </button>
                          </div>
                          {expanded &&
                            group.tiles.map((tile) => (
                              <Link
                                key={tile.to}
                                to={tile.to}
                                className="app-topbar__hamburger-leaf app-topbar__hamburger-leaf--indent"
                                onClick={() => setActiveMenu(null)}
                              >
                                <span>{tile.icon}</span> {tile.title}
                              </Link>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <Link to="/" className="app-topbar__brand">
              <span className="app-topbar__logo">S</span>
              SYSVEX
            </Link>
          </div>

          <div className="app-topbar__row-right">
            <div className="app-topbar__search">
              <form onSubmit={handleSearchSubmit}>
                <span className="app-topbar__search-icon">🔍</span>
                <input
                  type="search"
                  placeholder="Buscar um processo ou página…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveMenu('search');
                  }}
                  onFocus={() => setActiveMenu('search')}
                />
              </form>
              {activeMenu === 'search' && searchQuery.trim() !== '' && (
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

            <div className="app-topbar__avatar-wrap">
            {user && (
              <button
                type="button"
                className="app-topbar__avatar"
                onClick={() => setActiveMenu(activeMenu === 'avatar' ? null : 'avatar')}
              >
                {getInitials(user.fullName)}
              </button>
            )}
            {activeMenu === 'avatar' && user && (
              <div className="app-topbar__user-dropdown">
                <div className="app-topbar__user-dropdown-header">
                  <div className="app-topbar__user-dropdown-avatar">{getInitials(user.fullName)}</div>
                  <div>
                    <div className="app-topbar__user-dropdown-name">{user.fullName}</div>
                    <div className="app-topbar__user-dropdown-email">{user.email}</div>
                  </div>
                </div>
                <div className="app-topbar__user-dropdown-role">{ROLE_LABELS[user.role] ?? user.role}</div>
                <Link to="/account" className="app-topbar__user-dropdown-item" onClick={() => setActiveMenu(null)}>
                  ⚙️ Minha Conta
                </Link>
                <button
                  type="button"
                  className="app-topbar__user-dropdown-item app-topbar__user-dropdown-item--danger"
                  onClick={handleLogout}
                >
                  ⏻ Sair
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {apps.length > 0 && (
          <nav className="app-topbar__tabs">
            {apps.map((app) => {
              const tiles = tilesByGroupKey.get(app.key) ?? [];
              const isOpen = activeMenu === app.key;
              return (
                <div className={`app-topbar__tab-wrap ${isOpen ? 'app-topbar__tab-wrap--open' : ''}`} key={app.key}>
                  <Link to={`/lines/${app.key}`} className="app-topbar__tab">
                    {app.title}
                  </Link>
                  {tiles.length > 0 && (
                    <button
                      type="button"
                      className="app-topbar__tab-caret-btn"
                      onClick={() => setActiveMenu(isOpen ? null : app.key)}
                      aria-label={`Mostrar processos de ${app.title}`}
                    >
                      <span className="app-topbar__tab-caret">▾</span>
                    </button>
                  )}
                  {isOpen && tiles.length > 0 && (
                    <div className="app-topbar__dropdown">
                      {tiles.map((tile) => (
                        <Link
                          key={tile.to}
                          className="app-topbar__dropdown-item"
                          to={tile.to}
                          onClick={() => setActiveMenu(null)}
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
