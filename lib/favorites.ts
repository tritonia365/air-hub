export const MAX_FAVORITES = 5;

const FAVORITES_KEY = "air-hub:favorites";
const LAST_VIEWED_KEY = "air-hub:last-viewed";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export interface ToggleFavoriteResult {
  favorites: string[];
  limitReached: boolean;
}

export function toggleFavorite(sidoCode: string): ToggleFavoriteResult {
  const current = getFavorites();
  if (current.includes(sidoCode)) {
    const next = current.filter((c) => c !== sidoCode);
    saveFavorites(next);
    return { favorites: next, limitReached: false };
  }
  if (current.length >= MAX_FAVORITES) {
    return { favorites: current, limitReached: true };
  }
  const next = [...current, sidoCode];
  saveFavorites(next);
  return { favorites: next, limitReached: false };
}

export function getLastViewedSido(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_VIEWED_KEY);
}

export function setLastViewedSido(sidoCode: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_VIEWED_KEY, sidoCode);
}
