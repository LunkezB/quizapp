import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireCurrentUser } from "@/lib/auth";
import { getParticipantHistory } from "@/lib/history-queries";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireCurrentUser();
  const items = await getParticipantHistory(user.id);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
        <div>
          <Link href="/dashboard" prefetch={false} className="text-sm font-medium text-emerald-800">
            ← Назад в кабинет
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-950">Мои игры</h1>
          <p className="mt-1 text-sm text-zinc-600">Завершённые игры, в которых вы участвовали.</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8">
            <h2 className="text-lg font-semibold text-zinc-950">Вы ещё не играли</h2>
            <p className="mt-2 text-sm text-zinc-600">Подключитесь к игре по коду на странице «Подключиться».</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.sessionId}
                href={`/history/${item.sessionId}`}
                className="block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-950">{item.quizTitle}</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {new Date(item.endedAt).toLocaleString("ru-RU")} · {item.participantCount} участников
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Место</p>
                      <p className="text-xl font-bold text-emerald-800">
                        {item.rank} / {item.participantCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Очки</p>
                      <p className="text-xl font-bold text-zinc-950">{item.totalScore}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
