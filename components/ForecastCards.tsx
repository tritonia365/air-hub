import GradeBadge from "./GradeBadge";
import type { ForecastDay } from "@/lib/types";

const LABEL_TEXT: Record<ForecastDay["label"], string> = {
  today: "오늘",
  tomorrow: "내일",
  dayAfter: "모레",
};

export default function ForecastCards({ days }: { days: ForecastDay[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-600 mb-2">대기질 예보</h3>
      <div className="grid grid-cols-3 gap-3">
        {days.map((day) => (
          <div
            key={day.label}
            className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center gap-2"
          >
            <span className="text-sm font-medium text-slate-500">{LABEL_TEXT[day.label]}</span>
            {day.date && <span className="text-[11px] text-slate-400">{day.date}</span>}
            <GradeBadge grade={day.grade} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
