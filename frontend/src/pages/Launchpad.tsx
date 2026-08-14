import { CSSProperties, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAppUsage } from '../hooks/useAppUsage';
import { useProcessCounts } from '../hooks/useProcessCounts';
import { LAUNCHPAD_GROUPS } from '../launchpadGroups';
import { StarIcon, TileIcon } from '../icons';

interface Tile {
  to: string;
  icon: string;
  title: string;
  kpiLabel: string;
  kpiValue: string;
}

interface Group {
  key: string;
  title: string;
  color: string;
  colorDark: string;
  tiles: Tile[];
}

type UsageTab = 'favorites' | 'recents' | 'mostUsed';

const USAGE_TABS: Array<{ id: UsageTab; label: string }> = [
  { id: 'favorites', label: 'Favoritos' },
  { id: 'recents', label: 'Recentes' },
  { id: 'mostUsed', label: 'Mais usados' },
];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function Launchpad() {
  const { user, apps } = useAuth();
  const counts = useProcessCounts();
  const [usageTab, setUsageTab] = useState<UsageTab>('favorites');
  const { favorites, recents, mostUsed, toggleFavorite, isFavorite } = useAppUsage();

  const visibleKeys = apps.map((app) => app.key);
  const groups: Group[] = LAUNCHPAD_GROUPS.filter((group) => visibleKeys.includes(group.key))
    .sort((a, b) => visibleKeys.indexOf(a.key) - visibleKeys.indexOf(b.key))
    .map((group) => ({
      ...group,
      tiles: group.tiles.map((tile) => ({
        to: tile.to,
        icon: tile.icon,
        title: tile.title,
        kpiLabel: tile.kpiLabel ?? '',
        kpiValue: tile.kpiCountKey ? String(counts[tile.kpiCountKey] ?? '–') : '',
      })),
    }));

  const tileByPath = useMemo(() => {
    const map = new Map<string, { tile: Tile; groupColor: string; groupColorDark: string }>();
    groups.forEach((group) =>
      group.tiles.forEach((tile) => map.set(tile.to, { tile, groupColor: group.color, groupColorDark: group.colorDark })),
    );
    return map;
  }, [groups]);

  const usagePaths = usageTab === 'favorites' ? favorites : usageTab === 'recents' ? recents : mostUsed;
  const usageTiles = usagePaths.map((path) => tileByPath.get(path)).filter((entry): entry is NonNullable<typeof entry> => !!entry);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const today = capitalize(
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(
      new Date(),
    ),
  );

  return (
    <div>
      <div className="launchpad-banner">
        <div className="launchpad-banner__date">{today}</div>
        <div className="launchpad-banner__greeting">Olá, {firstName}, bom te ver!</div>
      </div>

      <div className="launchpad-columns">
        {groups.map((group) => (
          <div className="launchpad-group" id={group.key} key={group.key}>
            <h2>{group.title}</h2>
            <div className="tile-grid">
              {group.tiles.map((tile) => (
                <div className="tile-wrap" key={tile.to}>
                  <Link
                    className="tile tile--colored"
                    style={{ '--tile-color': group.color, '--tile-color-dark': group.colorDark } as CSSProperties}
                    to={tile.to}
                  >
                    <span className="tile__icon">
                      <TileIcon name={tile.icon} size={22} />
                    </span>
                    <div>
                      {tile.kpiValue !== '' && <div className="tile__kpi">{tile.kpiValue}</div>}
                      <div className="tile__title">{tile.title}</div>
                      {tile.kpiLabel && <div className="tile__subtitle">{tile.kpiLabel}</div>}
                    </div>
                  </Link>
                  <button
                    type="button"
                    className={`tile-favorite ${isFavorite(tile.to) ? 'tile-favorite--active' : ''}`}
                    onClick={() => toggleFavorite(tile.to)}
                    title={isFavorite(tile.to) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <StarIcon size={15} filled={isFavorite(tile.to)} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="launchpad-group">
        <h2>Apps</h2>
        <div className="apps-tabs">
          {USAGE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`apps-tabs__tab ${usageTab === tab.id ? 'apps-tabs__tab--active' : ''}`}
              onClick={() => setUsageTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        {usageTiles.length === 0 ? (
          <div className="empty-state">
            {usageTab === 'favorites' && 'Clique na estrela de um app para adicioná-lo aos favoritos.'}
            {usageTab === 'recents' && 'Os apps que você acessar vão aparecer aqui.'}
            {usageTab === 'mostUsed' && 'Os apps mais acessados por você vão aparecer aqui.'}
          </div>
        ) : (
          <div className="apps-tile-grid">
            {usageTiles.map(({ tile, groupColor, groupColorDark }) => (
              <Link className="apps-mini-tile" to={tile.to} key={tile.to}>
                <span
                  className="apps-mini-tile__icon"
                  style={{ '--tile-color': groupColor, '--tile-color-dark': groupColorDark } as CSSProperties}
                >
                  <TileIcon name={tile.icon} size={18} />
                </span>
                <span className="apps-mini-tile__title">{tile.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
