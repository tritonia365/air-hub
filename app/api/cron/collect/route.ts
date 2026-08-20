import { NextRequest, NextResponse } from "next/server";
import {
  AirKoreaConfigError,
  THOROUGH_BUDGET,
  fetchForecast,
  fetchRealtimeMeasurement,
} from "@/lib/airkorea";
import { setCache } from "@/lib/cache";
import { SIDO_LIST } from "@/lib/sido";
import type { SidoMeta } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PRD 8.2 — 사용자 요청과 공공 API 호출을 분리하기 위한 배치 수집 엔드포인트.
// 시간당 1회 호출하면 17개 시/도 캐시가 항상 신선하게 유지되어,
// 사용자 요청은 캐시만 읽게 되고 일 트래픽(개발계정 500회) 안에서 운영된다.

/** 원천 서버 부하를 피하기 위한 동시 실행 수 */
const CONCURRENCY = 4;
/** 서버리스 실행 시간(maxDuration)을 넘기지 않도록 하는 전체 마감 시간 */
const DEADLINE_MS = 50_000;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 미설정 시(로컬 개발) 자유 호출 허용
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const startedAt = Date.now();
  const succeeded: string[] = [];
  const failed: { sido: string; reason: string }[] = [];
  const skipped: string[] = [];
  let configError: string | null = null;

  const queue: SidoMeta[] = [...SIDO_LIST];

  async function worker() {
    for (;;) {
      const sido = queue.shift();
      if (!sido || configError) return;
      // 마감 시간을 넘기면 남은 시/도는 다음 배치로 미룬다 (캐시는 이전 값 유지)
      if (Date.now() - startedAt > DEADLINE_MS) {
        skipped.push(sido.code);
        continue;
      }
      try {
        const [airQuality, forecast] = await Promise.all([
          fetchRealtimeMeasurement(sido, THOROUGH_BUDGET),
          fetchForecast(sido, THOROUGH_BUDGET),
        ]);
        setCache(`air-quality:${sido.code}`, airQuality);
        setCache(`forecast:${sido.code}`, forecast);
        succeeded.push(sido.code);
      } catch (err) {
        if (err instanceof AirKoreaConfigError) {
          configError = err.message;
          return;
        }
        failed.push({
          sido: sido.code,
          reason: err instanceof Error ? err.message : "알 수 없는 오류",
        });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  return NextResponse.json({
    collectedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    succeeded,
    failed,
    skipped,
  });
}
