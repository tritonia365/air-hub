"use client";

import { useEffect, useState, useCallback } from "react";
import PollutantCard from "./PollutantCard";
import GradeBadge from "./GradeBadge";
import ForecastCards from "./ForecastCards";
import HealthGuidance from "./HealthGuidance";
import SkeletonPanel from "./SkeletonPanel";
import ErrorPanel from "./ErrorPanel";
import type { AirQualityData, ForecastData } from "@/lib/types";
import { findSidoByCode } from "@/lib/sido";

type PanelState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; airQuality: AirQualityData; forecast: ForecastData | null };

// 세션 내 재조회 시 즉시 표시(칩 클릭 → 500ms 이내)를 위한 클라이언트 캐시
const clientCache = new Map<string, { airQuality: AirQualityData; forecast: ForecastData | null }>();

function formatDataTime(dataTime: string | null): string {
  if (!dataTime) return "측정 시각 정보 없음";
  const match = dataTime.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (!match) return dataTime;
  return `${Number(match[2])}월 ${Number(match[3])}일 ${match[4]}:${match[5]} 기준`;
}

export default function AirQualityPanel({ sidoCode }: { sidoCode: string }) {
  const [state, setState] = useState<PanelState>({ status: "loading" });

  const load = useCallback(async (code: string, opts?: { skipCache?: boolean }) => {
    const cached = clientCache.get(code);
    if (cached && !opts?.skipCache) {
      setState({ status: "ready", ...cached });
      return;
    }
    setState({ status: "loading" });
    try {
      const [aqRes, fcRes] = await Promise.all([
        fetch(`/api/air-quality?sido=${code}`),
        fetch(`/api/air-quality/forecast?sido=${code}`),
      ]);

      if (!aqRes.ok) {
        const body = await aqRes.json().catch(() => ({}));
        throw new Error(body.error ?? "미세먼지 데이터를 불러오지 못했습니다.");
      }

      const airQuality: AirQualityData = await aqRes.json();
      // 예보는 부가 정보이므로 실패해도 실시간 농도는 그대로 보여준다.
      const forecast: ForecastData | null = fcRes.ok ? await fcRes.json() : null;

      clientCache.set(code, { airQuality, forecast });
      setState({ status: "ready", airQuality, forecast });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      });
    }
  }, []);

  useEffect(() => {
    load(sidoCode);
  }, [sidoCode, load]);

  const sido = findSidoByCode(sidoCode);

  if (state.status === "loading") {
    return <SkeletonPanel />;
  }

  if (state.status === "error") {
    return <ErrorPanel message={state.message} onRetry={() => load(sidoCode, { skipCache: true })} />;
  }

  const { airQuality, forecast } = state;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{sido?.name ?? airQuality.sidoName}</h2>
          <p className="text-xs text-slate-500">
            {formatDataTime(airQuality.dataTime)}
            {airQuality.stationCount > 0 && ` · 관내 측정소 ${airQuality.stationCount}곳 평균`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {airQuality.stale && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              갱신 지연 중
            </span>
          )}
          <GradeBadge grade={airQuality.overallGrade} size="lg" />
        </div>
      </div>

      <div className="flex gap-3">
        <PollutantCard label="PM10 (미세먼지)" unit="㎍/㎥" reading={airQuality.pm10} />
        <PollutantCard label="PM2.5 (초미세먼지)" unit="㎍/㎥" reading={airQuality.pm25} />
      </div>

      {forecast ? (
        <ForecastCards forecast={forecast} />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          대기질 예보를 불러오지 못했습니다.
        </p>
      )}

      <HealthGuidance grade={airQuality.overallGrade} />
    </div>
  );
}
