import GradeBadge from "./GradeBadge";
import type { ForecastData, ForecastDay } from "@/lib/types";

const LABEL_TEXT: Record<ForecastDay["label"], string> = {
  today: "오늘",
  tomorrow: "내일",
  dayAfter: "모레",
};

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const [, m, d] = date.split("-");
  return m && d ? `${Number(m)}.${Number(d)}` : date;
}

export default function ForecastCards({ forecast }: { forecast: ForecastData }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-600">대기질 예보</h3>
        {forecast.announcedAt && (
          <span className="text-[11px] text-slate-400">{forecast.announcedAt}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {forecast.days.map((day) => (
          <div
            key={day.label}
            className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center gap-1.5"
          >
            <span className="text-sm font-medium text-slate-600">{LABEL_TEXT[day.label]}</span>
            {day.date && <span className="text-[11px] text-slate-400">{formatDate(day.date)}</span>}
            <GradeBadge grade={day.grade} size="sm" />
          </div>
        ))}
      </div>
      {forecast.overall && (
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{forecast.overall}</p>
      )}
    </section>
  );
}
