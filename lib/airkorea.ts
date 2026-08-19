import type { AirQualityData, ForecastData, ForecastDay, SidoMeta } from "./types";
import { gradeFromKhaiGrade, gradeFromPm10, gradeFromPm25, worseGrade } from "./grade";

const REALTIME_ENDPOINT =
  "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty";
const FORECAST_ENDPOINT =
  "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth";

export class AirKoreaConfigError extends Error {}
export class AirKoreaApiError extends Error {}

function getServiceKey(): string {
  const key = process.env.AIRKOREA_SERVICE_KEY;
  if (!key || key.includes("여기에")) {
    throw new AirKoreaConfigError(
      "AIRKOREA_SERVICE_KEY가 설정되지 않았습니다. .env.local 파일에 발급받은 서비스키를 입력해주세요."
    );
  }
  return key;
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === "" || str === "-" || str.toLowerCase() === "null") return null;
  const n = Number(str);
  return Number.isNaN(n) ? null : n;
}

function getKstDateString(offsetDays: number): string {
  const now = new Date();
  // KST = UTC+9
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kstNow.setUTCDate(kstNow.getUTCDate() + offsetDays);
  const y = kstNow.getUTCFullYear();
  const m = String(kstNow.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kstNow.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 에어코리아 원천 서버가 게이트웨이 타임아웃(SERVICETIMEOUT_ERROR, 504 등)을 자주 반환하거나
// 아예 응답을 지연시키는 이슈에 대응하기 위한 짧은 재시도.
// fetch 자체에는 기본 타임아웃이 없어(무한 대기) 요청당 명시적으로 타임아웃을 걸어야
// 재시도 예산(총 대기 시간)이 실제로 지켜진다. 인증/파라미터 오류(4xx)는 재시도해도
// 소용없으므로 호출부에서 즉시 throw하고, 여기서는 순수 타임아웃/네트워크 실패/5xx만 재시도한다.
const REQUEST_TIMEOUT_MS = 6000;

async function fetchWithRetry(url: string, retries = 3, delayMs = 800): Promise<Response> {
  let lastRes: Response | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return res;
      lastRes = res;
      if (res.status < 500) return res; // 4xx는 재시도해도 동일하므로 즉시 반환
    } catch {
      // 타임아웃/네트워크 오류도 재시도 대상
    }
    if (attempt < retries) await sleep(delayMs);
  }
  if (lastRes) return lastRes;
  throw new AirKoreaApiError("에어코리아 API 서버 응답이 지연되고 있습니다 (타임아웃).");
}

export async function fetchRealtimeMeasurement(sido: SidoMeta): Promise<AirQualityData> {
  const serviceKey = getServiceKey();
  const params = new URLSearchParams({
    serviceKey,
    returnType: "json",
    numOfRows: "50",
    pageNo: "1",
    sidoName: sido.apiSidoName,
    ver: "1.0",
  });

  const res = await fetchWithRetry(`${REALTIME_ENDPOINT}?${params.toString()}`);

  if (!res.ok) {
    throw new AirKoreaApiError(`에어코리아 실시간 API 응답 오류 (status: ${res.status})`);
  }

  const json = await res.json();
  const header = json?.response?.header;
  if (header && header.resultCode !== "00") {
    throw new AirKoreaApiError(`에어코리아 API 오류: ${header.resultMsg ?? "알 수 없는 오류"}`);
  }

  const items: any[] = json?.response?.body?.items ?? [];
  if (items.length === 0) {
    throw new AirKoreaApiError("측정 데이터가 존재하지 않습니다.");
  }

  // 유효한 pm10/pm25 값을 가진 첫 측정소를 대표값으로 사용, 없으면 최초 항목 사용
  const representative =
    items.find((it) => parseNumeric(it.pm10Value) !== null || parseNumeric(it.pm25Value) !== null) ??
    items[0];

  const pm10Value = parseNumeric(representative.pm10Value);
  const pm25Value = parseNumeric(representative.pm25Value);
  const pm10Grade = gradeFromPm10(pm10Value);
  const pm25Grade = gradeFromPm25(pm25Value);
  const khaiGrade = gradeFromKhaiGrade(representative.khaiGrade);
  const overallGrade = khaiGrade ?? worseGrade(pm10Grade, pm25Grade);

  return {
    sidoCode: sido.code,
    sidoName: sido.name,
    stationName: representative.stationName ?? null,
    dataTime: representative.dataTime ?? null,
    pm10: { value: pm10Value, grade: pm10Grade },
    pm25: { value: pm25Value, grade: pm25Grade },
    overallGrade,
    stale: false,
  };
}

const GRADE_TEXT_TO_GRADE: Record<string, ForecastDay["grade"]> = {
  좋음: "good",
  보통: "moderate",
  나쁨: "bad",
  매우나쁨: "very-bad",
};

function extractGradeForSido(informGrade: string | undefined, sidoName: string): ForecastDay["grade"] {
  if (!informGrade) return null;
  const entries = informGrade.split(",");
  const match = entries.find((entry) => entry.trim().startsWith(sidoName));
  if (!match) return null;
  const parts = match.split(":");
  if (parts.length < 2) return null;
  const gradeText = parts[1].trim();
  return GRADE_TEXT_TO_GRADE[gradeText] ?? null;
}

async function fetchForecastItems(informCode: "PM10" | "PM25", searchDate: string): Promise<any[]> {
  const serviceKey = getServiceKey();
  const params = new URLSearchParams({
    serviceKey,
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    searchDate,
    InformCode: informCode,
  });

  const res = await fetchWithRetry(`${FORECAST_ENDPOINT}?${params.toString()}`);

  if (!res.ok) {
    throw new AirKoreaApiError(`에어코리아 예보 API 응답 오류 (status: ${res.status})`);
  }

  const json = await res.json();
  const header = json?.response?.header;
  if (header && header.resultCode !== "00") {
    throw new AirKoreaApiError(`에어코리아 예보 API 오류: ${header.resultMsg ?? "알 수 없는 오류"}`);
  }

  return json?.response?.body?.items ?? [];
}

export async function fetchForecast(sido: SidoMeta): Promise<ForecastData> {
  const today = getKstDateString(0);

  const [pm10Items, pm25Items] = await Promise.all([
    fetchForecastItems("PM10", today),
    fetchForecastItems("PM25", today),
  ]);

  const labels: { label: ForecastDay["label"]; offset: number }[] = [
    { label: "today", offset: 0 },
    { label: "tomorrow", offset: 1 },
    { label: "dayAfter", offset: 2 },
  ];

  const days: ForecastDay[] = labels.map(({ label, offset }) => {
    const targetDate = getKstDateString(offset);

    const findLatestForDate = (items: any[]) =>
      items
        .filter((it) => it.informData === targetDate)
        .sort((a, b) => (a.dataTime > b.dataTime ? -1 : 1))[0];

    const pm10Item = findLatestForDate(pm10Items);
    const pm25Item = findLatestForDate(pm25Items);

    const pm10Grade = extractGradeForSido(pm10Item?.informGrade, sido.apiSidoName);
    const pm25Grade = extractGradeForSido(pm25Item?.informGrade, sido.apiSidoName);
    const grade = worseGrade(pm10Grade, pm25Grade);
    const description: string | null = pm10Item?.informOverall ?? pm25Item?.informOverall ?? null;

    return {
      label,
      date: targetDate,
      grade,
      description,
    };
  });

  return {
    sidoCode: sido.code,
    sidoName: sido.name,
    days,
    stale: false,
  };
}
