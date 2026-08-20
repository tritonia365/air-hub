import type { SidoMeta } from "./types";

// 에어코리아 getCtprvnRltmMesureDnsty API의 sidoName 파라미터 값 기준.
// 예보 API(getMinuDustFrcstDspth)의 informGrade는 일부 시/도를 권역으로 쪼개 발표하므로
// (강원 → 영서/영동, 경기 → 경기남부/경기북부) 해당 시/도만 forecastRegions로 매핑한다.
export const SIDO_LIST: SidoMeta[] = [
  { code: "seoul", name: "서울", apiSidoName: "서울" },
  { code: "busan", name: "부산", apiSidoName: "부산" },
  { code: "daegu", name: "대구", apiSidoName: "대구" },
  { code: "incheon", name: "인천", apiSidoName: "인천" },
  { code: "gwangju", name: "광주", apiSidoName: "광주" },
  { code: "daejeon", name: "대전", apiSidoName: "대전" },
  { code: "ulsan", name: "울산", apiSidoName: "울산" },
  { code: "sejong", name: "세종", apiSidoName: "세종" },
  { code: "gyeonggi", name: "경기", apiSidoName: "경기", forecastRegions: ["경기남부", "경기북부"] },
  { code: "gangwon", name: "강원", apiSidoName: "강원", forecastRegions: ["영서", "영동"] },
  { code: "chungbuk", name: "충북", apiSidoName: "충북" },
  { code: "chungnam", name: "충남", apiSidoName: "충남" },
  { code: "jeonbuk", name: "전북", apiSidoName: "전북" },
  { code: "jeonnam", name: "전남", apiSidoName: "전남" },
  { code: "gyeongbuk", name: "경북", apiSidoName: "경북" },
  { code: "gyeongnam", name: "경남", apiSidoName: "경남" },
  { code: "jeju", name: "제주", apiSidoName: "제주" },
];

export const DEFAULT_SIDO_CODE = "seoul";

export function findSidoByCode(code: string): SidoMeta | undefined {
  return SIDO_LIST.find((s) => s.code === code);
}

export function forecastRegionsOf(sido: SidoMeta): string[] {
  return sido.forecastRegions ?? [sido.apiSidoName];
}
