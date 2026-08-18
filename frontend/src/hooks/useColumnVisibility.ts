import { useState } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
}

const storageKeyFor = (pageKey: string) => `sysvex.columns.${pageKey}`;

// Preferência de colunas visíveis por tela, persistida localmente no
// navegador (não é um dado de servidor, é só preferência de UI do usuário).
export function useColumnVisibility(pageKey: string, columns: ColumnDef[]) {
  const [visible, setVisible] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKeyFor(pageKey));
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      // ignora preferência corrompida e cai no padrão (tudo visível)
    }
    return new Set(columns.map((c) => c.key));
  });

  const setVisibleAndPersist = (next: Set<string>) => {
    setVisible(next);
    localStorage.setItem(storageKeyFor(pageKey), JSON.stringify([...next]));
  };

  const toggle = (key: string) => {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setVisibleAndPersist(next);
  };

  const isVisible = (key: string) => visible.has(key);

  return { visible, isVisible, toggle, setVisible: setVisibleAndPersist };
}
