import { SIDO_LIST } from "@/lib/sido";
import CityChip from "./CityChip";

export default function CityChipList({
  selectedCode,
  favorites,
  onSelect,
  onToggleFavorite,
}: {
  selectedCode: string;
  favorites: string[];
  onSelect: (code: string) => void;
  onToggleFavorite: (code: string) => void;
}) {
  const favoriteSet = new Set(favorites);
  const favoriteSidos = SIDO_LIST.filter((s) => favoriteSet.has(s.code));

  return (
    <div className="space-y-3">
      {favoriteSidos.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 mb-1.5 px-1">즐겨찾기</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-wrap">
            {favoriteSidos.map((sido) => (
              <CityChip
                key={sido.code}
                sido={sido}
                active={sido.code === selectedCode}
                isFavorite
                onSelect={onSelect}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 mb-1.5 px-1">전체 시/도</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-wrap">
          {SIDO_LIST.map((sido) => (
            <CityChip
              key={sido.code}
              sido={sido}
              active={sido.code === selectedCode}
              isFavorite={favoriteSet.has(sido.code)}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
