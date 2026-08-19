export default function SkeletonPanel() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="데이터를 불러오는 중">
      <div className="h-5 w-32 bg-slate-200 rounded" />
      <div className="flex gap-3">
        <div className="h-28 flex-1 bg-slate-200 rounded-xl" />
        <div className="h-28 flex-1 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-4 w-24 bg-slate-200 rounded" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 bg-slate-200 rounded-xl" />
        <div className="h-20 bg-slate-200 rounded-xl" />
        <div className="h-20 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-16 bg-slate-200 rounded-xl" />
    </div>
  );
}
