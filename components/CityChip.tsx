import type { SidoMeta } from "@/lib/types";

export default function CityChip({
  sido,
  active,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  sido: SidoMeta;
  active: boolean;
  isFavorite: boolean;
  onSelect: (code: string) => void;
  onToggleFavorite: (code: string) => void;
}) {
  return (
    <div
      className={`relative shrink-0 rounded-full border transition-colors ${
        active
          ? "border-sky-500 bg-sky-500 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(sido.code)}
        aria-pressed={active}
        className="px-4 py-2 pr-8 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 rounded-full"
      >
        {sido.name}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(sido.code);
        }}
        aria-label={isFavorite ? `${sido.name} 즐겨찾기 해제` : `${sido.name} 즐겨찾기 등록`}
        aria-pressed={isFavorite}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600 rounded-full ${
          active ? "text-white" : "text-slate-300 hover:text-amber-400"
        }`}
      >
        {isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
}
