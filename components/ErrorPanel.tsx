export default function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 p-8 text-center">
      <span className="text-3xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="text-sm font-medium text-red-700">일시적으로 데이터를 불러올 수 없습니다.</p>
      <p className="text-xs text-red-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        다시 시도
      </button>
    </div>
  );
}
