export type Grade = "good" | "moderate" | "bad" | "very-bad";

export interface SidoMeta {
  code: string;
  name: string;
  apiSidoName: string;
  /** 예보 API(informGrade)에서 이 시/도를 가리키는 권역명. 미지정 시 apiSidoName 사용 */
  forecastRegions?: string[];
}

export interface PollutantReading {
  value: number | null;
  grade: Grade | null;
}

export interface AirQualityData {
  sidoCode: string;
  sidoName: string;
  /** 평균 산출에 사용된 측정소 수 (0이면 결측) */
  stationCount: number;
  dataTime: string | null;
  pm10: PollutantReading;
  pm25: PollutantReading;
  overallGrade: Grade | null;
  stale: boolean;
}

export interface ForecastDay {
  label: "today" | "tomorrow" | "dayAfter";
  date: string | null;
  grade: Grade | null;
}

export interface ForecastData {
  sidoCode: string;
  sidoName: string;
  days: ForecastDay[];
  /** 예보 총평(informOverall) */
  overall: string | null;
  /** 예보 발표 시각(dataTime) */
  announcedAt: string | null;
  stale: boolean;
}

export interface ApiErrorResponse {
  error: string;
}
