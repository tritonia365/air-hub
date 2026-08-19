import { GRADE_HEALTH_GUIDANCE } from "@/lib/grade";
import type { Grade } from "@/lib/types";

export default function HealthGuidance({ grade }: { grade: Grade | null }) {
  const text = grade
    ? GRADE_HEALTH_GUIDANCE[grade]
    : "현재 등급 정보가 없어 행동요령을 표시할 수 없습니다.";

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-600 mb-1">건강 행동요령</h3>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}
