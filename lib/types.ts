export type Grade = "good" | "moderate" | "bad" | "very-bad";

export interface SidoMeta {
  code: string;
  name: string;
  apiSidoName: string;
}

export interface PollutantReading {
  value: number | null;
  grade: Grade | null;
}

export interface AirQualityData {
  sidoCode: string;
  sidoName: string;
  stationName: string | null;
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
  description: string | null;
}

export interface ForecastData {
  sidoCode: string;
  sidoName: string;
  days: ForecastDay[];
  stale: boolean;
}

export interface ApiErrorResponse {
  error: string;
}
