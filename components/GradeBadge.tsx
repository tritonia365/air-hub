import { GRADE_COLOR, GRADE_LABEL } from "@/lib/grade";
import type { Grade } from "@/lib/types";

export default function GradeBadge({
  grade,
  size = "md",
}: {
  grade: Grade | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!grade) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-500">
        <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
        데이터 없음
      </span>
    );
  }

  const sizeClasses =
    size === "lg" ? "px-4 py-1.5 text-base" : size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-white ${sizeClasses}`}
      style={{ backgroundColor: GRADE_COLOR[grade] }}
    >
      <span className="h-2 w-2 rounded-full bg-white/80" aria-hidden="true" />
      {GRADE_LABEL[grade]}
    </span>
  );
}
