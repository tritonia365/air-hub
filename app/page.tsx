"use client";

import { useEffect, useState } from "react";
import CityChipList from "@/components/CityChipList";
import AirQualityPanel from "@/components/AirQualityPanel";
import { DEFAULT_SIDO_CODE } from "@/lib/sido";
import { getFavorites, getLastViewedSido, setLastViewedSido, toggleFavorite, MAX_FAVORITES } from "@/lib/favorites";

export default function HomePage() {
  const [selectedCode, setSelectedCode] = useState(DEFAULT_SIDO_CODE);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [limitNotice, setLimitNotice] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
    const lastViewed = getLastViewedSido();
    if (lastViewed) setSelectedCode(lastViewed);
  }, []);

  useEffect(() => {
    if (limitNotice) {
      const t = setTimeout(() => setLimitNotice(false), 2500);
      return () => clearTimeout(t);
    }
  }, [limitNotice]);

  function handleSelect(code: string) {
    setSelectedCode(code);
    setLastViewedSido(code);
  }

  function handleToggleFavorite(code: string) {
    const result = toggleFavorite(code);
    setFavorites(result.favorites);
    if (result.limitReached) {
      setLimitNotice(true);
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="md:w-[320px] md:shrink-0 space-y-2">
        <CityChipList
          selectedCode={selectedCode}
          favorites={favorites}
          onSelect={handleSelect}
          onToggleFavorite={handleToggleFavorite}
        />
        {limitNotice && (
          <p className="text-xs font-medium text-amber-600" role="alert">
            즐겨찾기는 최대 {MAX_FAVORITES}개까지 등록할 수 있습니다.
          </p>
        )}
      </div>
      <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <AirQualityPanel sidoCode={selectedCode} />
      </div>
    </div>
  );
}
