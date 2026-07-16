"use client";

export default function HostHistoryDetailError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-xl rounded-[12px] border border-line bg-surface p-8 shadow-soft">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Не удалось загрузить статистику игры</h1>
        <p className="mt-2 text-sm text-muted">Попробуйте повторить запрос.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 h-10 rounded-[6px] bg-ink px-4 text-sm font-medium text-white transition hover:bg-ink-soft active:scale-[0.98]"
        >
          Повторить
        </button>
      </div>
    </main>
  );
}
