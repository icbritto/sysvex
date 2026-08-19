import { useState } from 'react';

export interface ColumnDef {
  key: string;
  label: string;
}

const visibilityKeyFor = (pageKey: string) => `sysvex.columns.${pageKey}`;
const orderKeyFor = (pageKey: string) => `sysvex.columns-order.${pageKey}`;

// Preferência de colunas visíveis e sua ordem, por tela, persistida
// localmente no navegador (não é um dado de servidor, é só preferência de
// UI do usuário).
export function useColumnVisibility(pageKey: string, columns: ColumnDef[]) {
  const [visible, setVisible] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(visibilityKeyFor(pageKey));
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      // ignora preferência corrompida e cai no padrão (tudo visível)
    }
    return new Set(columns.map((c) => c.key));
  });

  const [order, setOrder] = useState<string[]>(() => {
    const knownKeys = columns.map((c) => c.key);
    try {
      const raw = localStorage.getItem(orderKeyFor(pageKey));
      if (raw) {
        const saved = (JSON.parse(raw) as string[]).filter((k) => knownKeys.includes(k));
        const missing = knownKeys.filter((k) => !saved.includes(k));
        return [...saved, ...missing];
      }
    } catch {
      // ignora preferência corrompida e cai na ordem padrão das colunas
    }
    return knownKeys;
  });

  const setVisibleAndPersist = (next: Set<string>) => {
    setVisible(next);
    localStorage.setItem(visibilityKeyFor(pageKey), JSON.stringify([...next]));
  };

  const setOrderAndPersist = (next: string[]) => {
    setOrder(next);
    localStorage.setItem(orderKeyFor(pageKey), JSON.stringify(next));
  };

  const toggle = (key: string) => {
    const next = new Set(visible);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setVisibleAndPersist(next);
  };

  const moveUp = (key: string) => {
    const idx = order.indexOf(key);
    if (idx <= 0) return;
    const next = [...order];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrderAndPersist(next);
  };

  const moveDown = (key: string) => {
    const idx = order.indexOf(key);
    if (idx === -1 || idx >= order.length - 1) return;
    const next = [...order];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setOrderAndPersist(next);
  };

  const isVisible = (key: string) => visible.has(key);

  const orderedColumns = order
    .map((key) => columns.find((c) => c.key === key))
    .filter((c): c is ColumnDef => Boolean(c));

  return {
    visible,
    isVisible,
    toggle,
    setVisible: setVisibleAndPersist,
    order,
    orderedColumns,
    moveUp,
    moveDown,
  };
}
