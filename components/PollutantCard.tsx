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
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center gap-2 min-w-[140px]">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-3xl font-bold text-slate-900">
        {reading.value !== null ? reading.value : "–"}
        {reading.value !== null && (
          <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
        )}
      </span>
      <GradeBadge grade={reading.grade} size="sm" />
    </div>
  );
}
