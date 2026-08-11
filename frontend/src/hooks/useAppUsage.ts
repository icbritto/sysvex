import { useCallback } from 'react';
import { useState } from 'react';

const RECENTS_KEY = 'sysvex.recents';
const FAVORITES_KEY = 'sysvex.favorites';
const VISITS_KEY = 'sysvex.visitCounts';
const MAX_RECENTS = 8;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Rastreia uso de páginas (favoritos/recentes/mais usados) localmente no
// navegador, sem depender de dados de servidor que o SYSVEX não coleta hoje.
export function recordVisit(path: string): void {
  const recents = readJSON<string[]>(RECENTS_KEY, []);
  writeJSON(RECENTS_KEY, [path, ...recents.filter((p) => p !== path)].slice(0, MAX_RECENTS));

  const counts = readJSON<Record<string, number>>(VISITS_KEY, {});
  counts[path] = (counts[path] ?? 0) + 1;
  writeJSON(VISITS_KEY, counts);
}

export function useAppUsage() {
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const toggleFavorite = useCallback(
    (path: string) => {
      const favorites = readJSON<string[]>(FAVORITES_KEY, []);
      const next = favorites.includes(path) ? favorites.filter((p) => p !== path) : [...favorites, path];
      writeJSON(FAVORITES_KEY, next);
      bump();
    },
    [bump],
  );

  const favorites = readJSON<string[]>(FAVORITES_KEY, []);
  const recents = readJSON<string[]>(RECENTS_KEY, []);
  const mostUsed = Object.entries(readJSON<Record<string, number>>(VISITS_KEY, {}))
    .sort((a, b) => b[1] - a[1])
    .map(([path]) => path);

  return {
    favorites,
    recents,
    mostUsed,
    toggleFavorite,
    isFavorite: (path: string) => favorites.includes(path),
  };
}
