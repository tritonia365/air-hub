import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "에어허브 | 시도별 미세먼지 정보",
  description: "전국 17개 시/도의 실시간 미세먼지·초미세먼지 농도와 예보, 건강 행동요령을 한 번에 확인하세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                🌤️
              </span>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">에어허브</h1>
                <p className="text-xs text-slate-500 leading-tight">시도별 미세먼지 정보</p>
              </div>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400">
              데이터 출처: 한국환경공단 에어코리아(공공데이터포털) · 개인 프로젝트/포트폴리오용
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
