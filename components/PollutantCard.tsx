import GradeBadge from "./GradeBadge";
import type { PollutantReading } from "@/lib/types";

export default function PollutantCard({
  label,
  unit,
  reading,
}: {
  label: string;
  unit: string;
  reading: PollutantReading;
}) {
  const hasValue = reading.value !== null;

  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center gap-2 min-w-[140px]">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      {hasValue ? (
        <span className="text-3xl font-bold text-slate-900">
          {reading.value}
          <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
        </span>
      ) : (
        // 결측치를 0으로 오인하지 않도록 수치 대신 명시적으로 표기한다 (PRD FR-04)
        <span className="py-1.5 text-sm font-semibold text-slate-400">측정 데이터 없음</span>
      )}
      <GradeBadge grade={reading.grade} size="sm" />
    </div>
  );
}
