import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Vercel 서버리스 함수는 배포 파일시스템이 읽기 전용이고 /tmp만 쓰기 가능하므로,
// process.cwd() 하위 경로를 쓰면 프로덕션에서 매번 조용히 실패한다.
const CACHE_DIR = path.join(os.tmpdir(), "air-hub-cache");

/** 실시간 측정치: 원천이 매시 정각 갱신되므로 20분이면 신선도(최대 1시간) 요건 충족 */
export const REALTIME_TTL_MS = 20 * 60 * 1000;
/** 예보: 하루 4회(05/11/17/23시) 발표 → 2시간 */
export const FORECAST_TTL_MS = 2 * 60 * 60 * 1000;

const DEFAULT_TTL_MS = REALTIME_TTL_MS;

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

/**
 * key에 대한 캐시를 조회한다.
 * fresh: TTL 이내의 최신 데이터
 * stale: TTL은 지났지만 존재하는 마지막 성공 데이터 (원천 API 장애 시 폴백용)
 */
export function getCache<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS
): { fresh: T | null; stale: T | null; savedAt: number | null } {
  let entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    const fileEntry = readFileCache<T>(key);
    if (fileEntry) {
      entry = fileEntry;
      memoryCache.set(key, fileEntry);
    }
  }
  if (!entry) return { fresh: null, stale: null, savedAt: null };

  const isFresh = Date.now() - entry.savedAt < ttlMs;
  return {
    fresh: isFresh ? entry.data : null,
    stale: entry.data,
    savedAt: entry.savedAt,
  };
}

export function setCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, savedAt: Date.now() };
  memoryCache.set(key, entry);
  writeFileCache(key, entry);
}
