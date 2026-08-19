import type { Grade } from "./types";

// PRD 9.1 통합대기환경지수(CAI) 등급 기준
export function gradeFromPm10(value: number | null): Grade | null {
  if (value === null || Number.isNaN(value)) return null;
  if (value <= 30) return "good";
  if (value <= 80) return "moderate";
  if (value <= 150) return "bad";
  return "very-bad";
}

export function gradeFromPm25(value: number | null): Grade | null {
  if (value === null || Number.isNaN(value)) return null;
  if (value <= 15) return "good";
  if (value <= 35) return "moderate";
  if (value <= 75) return "bad";
  return "very-bad";
}

// 더 나쁜 등급을 종합등급으로 채택
const GRADE_RANK: Record<Grade, number> = {
  good: 0,
  moderate: 1,
  bad: 2,
  "very-bad": 3,
};

export function worseGrade(a: Grade | null, b: Grade | null): Grade | null {
  if (a === null) return b;
  if (b === null) return a;
  return GRADE_RANK[a] >= GRADE_RANK[b] ? a : b;
}

export const GRADE_LABEL: Record<Grade, string> = {
  good: "좋음",
  moderate: "보통",
  bad: "나쁨",
  "very-bad": "매우나쁨",
};

export const GRADE_COLOR: Record<Grade, string> = {
  good: "#4A90D9",
  moderate: "#5CB85C",
  bad: "#F0AD4E",
  "very-bad": "#D9534F",
};

// PRD 9.2 등급별 건강 행동요령
export const GRADE_HEALTH_GUIDANCE: Record<Grade, string> = {
  good: "실외활동에 제한이 필요하지 않습니다.",
  moderate: "민감군은 장시간·무리한 실외활동을 다소 제한하는 것이 좋습니다.",
  bad: "민감군은 실외활동을 제한하고, 일반인은 장시간 실외활동을 자제하는 것이 좋습니다.",
  "very-bad":
    "민감군은 실외활동을 금지하고, 일반인도 가급적 실외활동을 자제하며 마스크 착용을 권고합니다.",
};

// 에어코리아 khaiGrade(1~4) → 내부 Grade 매핑
export function gradeFromKhaiGrade(khaiGrade: string | number | null): Grade | null {
  if (khaiGrade === null || khaiGrade === undefined || khaiGrade === "") return null;
  const n = Number(khaiGrade);
  if (Number.isNaN(n)) return null;
  switch (n) {
    case 1:
      return "good";
    case 2:
      return "moderate";
    case 3:
      return "bad";
    case 4:
      return "very-bad";
    default:
      return null;
  }
}
