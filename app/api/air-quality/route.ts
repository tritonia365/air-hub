import { NextRequest, NextResponse } from "next/server";
import { AirKoreaApiError, AirKoreaConfigError, fetchRealtimeMeasurement } from "@/lib/airkorea";
import { getCache, REALTIME_TTL_MS, setCache } from "@/lib/cache";
import { findSidoByCode } from "@/lib/sido";
import type { AirQualityData } from "@/lib/types";

export async function GET(request: NextRequest) {
  const sidoCode = request.nextUrl.searchParams.get("sido");
  if (!sidoCode) {
    return NextResponse.json({ error: "sido 파라미터가 필요합니다." }, { status: 400 });
  }

  const sido = findSidoByCode(sidoCode);
  if (!sido) {
    return NextResponse.json({ error: `알 수 없는 시/도 코드입니다: ${sidoCode}` }, { status: 400 });
  }

  const cacheKey = `air-quality:${sido.code}`;
  const { fresh, stale } = getCache<AirQualityData>(cacheKey, REALTIME_TTL_MS);

  if (fresh) {
    return NextResponse.json(fresh);
  }

  try {
    const data = await fetchRealtimeMeasurement(sido);
    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (err) {
    if (stale) {
      return NextResponse.json({ ...stale, stale: true });
    }
    if (err instanceof AirKoreaConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    if (err instanceof AirKoreaApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "일시적으로 데이터를 불러올 수 없습니다." },
      { status: 502 }
    );
  }
}
