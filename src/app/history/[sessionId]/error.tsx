"use client";

export default function HistoryDetailError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-zinc-950">Не удалось загрузить детали игры</h1>
        <p className="mt-2 text-sm text-zinc-600">Попробуйте повторить запрос.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white"
        >
          Повторить
        </button>
      </div>
    </main>
  );
}
