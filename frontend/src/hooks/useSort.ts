import { useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  key: string;
  label: string;
}

const storageKeyFor = (pageKey: string) => `sysvex.sort.${pageKey}`;

// Preferência de ordenação por tela, persistida localmente no navegador
// (mesmo esquema do useColumnVisibility, mas guardando coluna + direção).
export function useSort(pageKey: string, options: SortOption[], defaultKey?: string) {
  const [state, setState] = useState<{ key: string; direction: SortDirection }>(() => {
    try {
      const raw = localStorage.getItem(storageKeyFor(pageKey));
      if (raw) {
        const parsed = JSON.parse(raw) as { key?: string; direction?: SortDirection };
        if (parsed.key && (parsed.direction === 'asc' || parsed.direction === 'desc')) {
          return { key: parsed.key, direction: parsed.direction };
        }
      }
    } catch {
      // ignora preferência corrompida e cai no padrão
    }
    return { key: defaultKey ?? options[0]?.key ?? '', direction: 'asc' };
  });

  const setSort = (key: string, direction: SortDirection) => {
    setState({ key, direction });
    localStorage.setItem(storageKeyFor(pageKey), JSON.stringify({ key, direction }));
  };

  return { sortKey: state.key, direction: state.direction, setSort, options };
}
