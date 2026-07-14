import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-zinc-950">Страница не найдена</h1>
        <p className="mt-2 text-sm text-zinc-600">Ресурс не существует или недоступен текущему пользователю.</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white"
        >
          В кабинет
        </Link>
      </div>
    </main>
  );
}
