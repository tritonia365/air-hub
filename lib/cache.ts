import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.join(process.cwd(), "data", "cache");
const TTL_MS = 10 * 60 * 1000; // 10분

interface CacheEntry<T> {
  data: T;
  savedAt: number;
}

// 개발 서버(Hot reload) 재실행에도 유지되도록 globalThis에 저장
const memoryCache: Map<string, CacheEntry<unknown>> =
  (globalThis as any).__airHubMemoryCache ?? new Map();
(globalThis as any).__airHubMemoryCache = memoryCache;

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function filePathFor(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

function readFileCache<T>(key: string): CacheEntry<T> | null {
  try {
    const filePath = filePathFor(key);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeFileCache<T>(key: string, entry: CacheEntry<T>) {
  try {
    ensureCacheDir();
    fs.writeFileSync(filePathFor(key), JSON.stringify(entry), "utf-8");
  } catch {
    // 파일 캐시 저장 실패는 치명적이지 않음 (메모리 캐시로 동작 지속)
  }
}

export interface CacheResult<T> {
  data: T;
  stale: boolean;
}

/**
 * key에 대한 캐시를 조회한다.
 * fresh: TTL 이내의 최신 데이터
 * stale: TTL은 지났지만 존재하는 마지막 성공 데이터 (fallback용)
 * miss: 캐시 없음
 */
export function getCache<T>(key: string): { fresh: T | null; stale: T | null } {
  let entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    const fileEntry = readFileCache<T>(key);
    if (fileEntry) {
      entry = fileEntry;
      memoryCache.set(key, fileEntry);
    }
  }
  if (!entry) return { fresh: null, stale: null };

  const isFresh = Date.now() - entry.savedAt < TTL_MS;
  return {
    fresh: isFresh ? entry.data : null,
    stale: entry.data,
  };
}

export function setCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, savedAt: Date.now() };
  memoryCache.set(key, entry);
  writeFileCache(key, entry);
}
