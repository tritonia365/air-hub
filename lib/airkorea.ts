import type { AirQualityData, ForecastData, ForecastDay, Grade, SidoMeta } from "./types";
import { gradeFromPm10, gradeFromPm25, worseGrade } from "./grade";
import { forecastRegionsOf } from "./sido";
import { FORECAST_TTL_MS, getCache, setCache } from "./cache";

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

/** KST(UTC+9) 기준 offsetDays일 뒤의 yyyy-MM-dd */
function getKstDateString(offsetDays: number): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 에어코리아 원천 서버는 과부하 시 HTTP 200과 함께 정상 응답 봉투가 아닌
// {"OpenAPI_ServiceResponse":{"cmmMsgHeader":{"errMsg":"SERVICETIMEOUT_ERROR"...}}} 를 반환한다.
// 즉 res.ok 만으로는 성공을 판단할 수 없어, 본문 봉투 종류까지 확인한 뒤 재시도해야 한다.
// fetch에는 기본 타임아웃이 없으므로(무한 대기) 요청마다 명시적으로 타임아웃을 건다.
export interface RetryBudget {
  attempts: number;
  timeoutMs: number;
  delayMs: number;
}

/** 사용자 요청 경로: 최악의 경우에도 ~11초 안에 에러 UI로 떨어지도록 짧게 잡는다. */
export const FAST_BUDGET: RetryBudget = { attempts: 2, timeoutMs: 5000, delayMs: 600 };
/** 배치 수집 경로: 사용자가 기다리지 않으므로 끈질기게 재시도한다. */
export const THOROUGH_BUDGET: RetryBudget = { attempts: 4, timeoutMs: 8000, delayMs: 700 };

interface AirKoreaEnvelope {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: unknown };
  };
  OpenAPI_ServiceResponse?: {
    cmmMsgHeader?: { errMsg?: string; returnAuthMsg?: string; returnReasonCode?: string };
  };
}

/** 인증키/파라미터 오류 등 재시도해도 결과가 같은 오류 코드 */
const NON_RETRYABLE_REASON_CODES = new Set(["20", "22", "30", "31", "32"]);

async function requestItems(
  endpoint: string,
  params: URLSearchParams,
  budget: RetryBudget
): Promise<any[]> {
  const url = `${endpoint}?${params.toString()}`;
  let lastMessage = "에어코리아 API 서버 응답이 지연되고 있습니다.";

  for (let attempt = 1; attempt <= budget.attempts; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(budget.timeoutMs),
      });

      if (!res.ok) {
        lastMessage = `에어코리아 API 응답 오류 (status: ${res.status})`;
        if (res.status < 500) throw new AirKoreaApiError(lastMessage); // 4xx는 재시도 무의미
      } else {
        const json = (await res.json().catch(() => null)) as AirKoreaEnvelope | null;
        const fault = json?.OpenAPI_ServiceResponse?.cmmMsgHeader;

        if (fault) {
          lastMessage = `에어코리아 API 오류: ${fault.errMsg ?? fault.returnAuthMsg ?? "알 수 없는 오류"}`;
          if (fault.returnReasonCode && NON_RETRYABLE_REASON_CODES.has(fault.returnReasonCode)) {
            throw new AirKoreaApiError(lastMessage);
          }
        } else if (json?.response) {
          const header = json.response.header;
          if (header?.resultCode && header.resultCode !== "00") {
            throw new AirKoreaApiError(
              `에어코리아 API 오류: ${header.resultMsg ?? "알 수 없는 오류"}`
            );
          }
          const items = json.response.body?.items;
          return Array.isArray(items) ? items : [];
        } else {
          lastMessage = "에어코리아 API 응답 형식을 해석할 수 없습니다.";
        }
      }
    } catch (err) {
      if (err instanceof AirKoreaApiError) throw err;
      // 타임아웃/네트워크 오류는 재시도 대상
    }
    if (attempt < budget.attempts) await sleep(budget.delayMs * attempt);
  }

  throw new AirKoreaApiError(lastMessage);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * 시/도 실시간 측정정보.
 * 시/도 단위 화면이므로 특정 측정소 하나가 아니라 관내 전 측정소의 평균을 대표값으로 쓴다.
 */
export async function fetchRealtimeMeasurement(
  sido: SidoMeta,
  budget: RetryBudget = FAST_BUDGET
): Promise<AirQualityData> {
  const params = new URLSearchParams({
    serviceKey: getServiceKey(),
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    sidoName: sido.apiSidoName,
    ver: "1.0",
  });

  const items = await requestItems(REALTIME_ENDPOINT, params, budget);
  if (items.length === 0) {
    throw new AirKoreaApiError("측정 데이터가 존재하지 않습니다.");
  }

  const pm10Values: number[] = [];
  const pm25Values: number[] = [];
  let contributing = 0;

  for (const item of items) {
    // pm10Flag/pm25Flag는 점검·통신장애 등 결측 사유. 값이 있어도 신뢰할 수 없으므로 제외한다.
    const pm10 = item.pm10Flag ? null : parseNumeric(item.pm10Value);
    const pm25 = item.pm25Flag ? null : parseNumeric(item.pm25Value);
    if (pm10 !== null) pm10Values.push(pm10);
    if (pm25 !== null) pm25Values.push(pm25);
    if (pm10 !== null || pm25 !== null) contributing += 1;
  }

  const pm10Avg = average(pm10Values);
  const pm25Avg = average(pm25Values);
  const pm10Grade = gradeFromPm10(pm10Avg);
  const pm25Grade = gradeFromPm25(pm25Avg);

  // 측정소별로 갱신 시각이 소폭 다를 수 있어 가장 최신 시각을 기준으로 표기한다.
  const dataTime =
    items
      .map((it) => (typeof it.dataTime === "string" ? it.dataTime : null))
      .filter((t): t is string => Boolean(t))
      .sort()
      .pop() ?? null;

  return {
    sidoCode: sido.code,
    sidoName: sido.name,
    stationCount: contributing,
    dataTime,
    pm10: { value: pm10Avg, grade: pm10Grade },
    pm25: { value: pm25Avg, grade: pm25Grade },
    overallGrade: worseGrade(pm10Grade, pm25Grade),
    stale: false,
  };
}

const GRADE_TEXT_TO_GRADE: Record<string, Grade> = {
  좋음: "good",
  보통: "moderate",
  나쁨: "bad",
  매우나쁨: "very-bad",
};

/**
 * informGrade 예: "서울 : 좋음,경기남부 : 보통,영서 : 나쁨,..."
 * 강원(영서/영동), 경기(남부/북부)처럼 여러 권역으로 나뉘어 발표되는 시/도는
 * 가장 나쁜 권역 등급을 대표값으로 삼는다.
 */
function extractGradeForSido(informGrade: unknown, regions: string[]): Grade | null {
  if (typeof informGrade !== "string") return null;
  const table = new Map<string, Grade>();
  for (const entry of informGrade.split(",")) {
    const idx = entry.indexOf(":");
    if (idx === -1) continue;
    const region = entry.slice(0, idx).trim();
    const grade = GRADE_TEXT_TO_GRADE[entry.slice(idx + 1).trim()];
    if (region && grade) table.set(region, grade);
  }
  return regions.reduce<Grade | null>(
    (acc, region) => worseGrade(acc, table.get(region) ?? null),
    null
  );
}

/** 예보 원문은 전국 공통이므로 시/도별로 재호출하지 않고 (코드, 발표일) 단위로 캐시해 재사용한다. */
async function getForecastItems(
  informCode: "PM10" | "PM25",
  searchDate: string,
  budget: RetryBudget
): Promise<any[]> {
  const cacheKey = `forecast-raw:${informCode}:${searchDate}`;
  const { fresh } = getCache<any[]>(cacheKey, FORECAST_TTL_MS);
  if (fresh) return fresh;

  const params = new URLSearchParams({
    serviceKey: getServiceKey(),
    returnType: "json",
    numOfRows: "100",
    pageNo: "1",
    searchDate,
    InformCode: informCode,
  });

  const items = await requestItems(FORECAST_ENDPOINT, params, budget);
  setCache(cacheKey, items);
  return items;
}

/** dataTime 예: "2026-08-19 11시 발표" — 같은 예보일 중 가장 늦게 발표된 건을 채택 */
function latestForDate(items: any[], date: string): any | undefined {
  return items
    .filter((it) => it?.informData === date)
    .sort((a, b) => String(a.dataTime).localeCompare(String(b.dataTime)))
    .pop();
}

export async function fetchForecast(
  sido: SidoMeta,
  budget: RetryBudget = FAST_BUDGET
): Promise<ForecastData> {
  const today = getKstDateString(0);
  const yesterday = getKstDateString(-1);
  const regions = forecastRegionsOf(sido);

  let [pm10Items, pm25Items] = await Promise.all([
    getForecastItems("PM10", today, budget),
    getForecastItems("PM25", today, budget),
  ]);

  // 당일 첫 발표(05시) 전이면 오늘자 조회가 비어 있으므로 전일 발표분으로 보완한다.
  if (pm10Items.length === 0 || pm25Items.length === 0) {
    const [pm10Prev, pm25Prev] = await Promise.all([
      getForecastItems("PM10", yesterday, budget),
      getForecastItems("PM25", yesterday, budget),
    ]);
    pm10Items = [...pm10Prev, ...pm10Items];
    pm25Items = [...pm25Prev, ...pm25Items];
  }

  const labels: { label: ForecastDay["label"]; offset: number }[] = [
    { label: "today", offset: 0 },
    { label: "tomorrow", offset: 1 },
    { label: "dayAfter", offset: 2 },
  ];

  const days: ForecastDay[] = labels.map(({ label, offset }) => {
    const targetDate = getKstDateString(offset);
    const pm10Item = latestForDate(pm10Items, targetDate);
    const pm25Item = latestForDate(pm25Items, targetDate);
    return {
      label,
      date: targetDate,
      grade: worseGrade(
        extractGradeForSido(pm10Item?.informGrade, regions),
        extractGradeForSido(pm25Item?.informGrade, regions)
      ),
    };
  });

  const todayItem = latestForDate(pm10Items, today) ?? latestForDate(pm25Items, today);

  return {
    sidoCode: sido.code,
    sidoName: sido.name,
    days,
    overall: typeof todayItem?.informOverall === "string" ? todayItem.informOverall : null,
    announcedAt: typeof todayItem?.dataTime === "string" ? todayItem.dataTime : null,
    stale: false,
  };
}
