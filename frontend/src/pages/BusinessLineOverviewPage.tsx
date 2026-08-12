import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useProcessCounts } from '../hooks/useProcessCounts';
import { LAUNCHPAD_GROUPS } from '../launchpadGroups';

export default function BusinessLineOverviewPage() {
  const { key } = useParams<{ key: string }>();
  const { apps } = useAuth();
  const counts = useProcessCounts();

  const group = LAUNCHPAD_GROUPS.find((g) => g.key === key);
  const isVisible = apps.some((app) => app.key === key);

  if (!group || !isVisible) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>{group.title}</h1>
      </div>

      <div className="launchpad-group">
        <h2>Processos</h2>
        <div className="tile-grid">
          {group.tiles.map((tile) => (
            <Link className="tile" to={tile.to} key={tile.to}>
              <span className="tile__icon">{tile.icon}</span>
              <div>
                {tile.kpiCountKey && <div className="tile__kpi">{String(counts[tile.kpiCountKey] ?? '–')}</div>}
                <div className="tile__title">{tile.title}</div>
                {tile.kpiLabel && <div className="tile__subtitle">{tile.kpiLabel}</div>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
