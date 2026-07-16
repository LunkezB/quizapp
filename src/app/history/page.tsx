import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireCurrentUser } from "@/lib/auth";
import { getParticipantHistory } from "@/lib/history-queries";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireCurrentUser();
  const items = await getParticipantHistory(user.id);

  return (
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
        <div className="fade-up">
          <Link href="/dashboard" prefetch={false} className="text-sm font-medium text-muted transition-colors hover:text-ink">
            ← Назад в кабинет
          </Link>
          <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Мои игры</h1>
          <p className="mt-2 text-sm text-muted">Завершённые игры, в которых вы участвовали.</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-line-strong bg-surface p-10 text-center">
            <h2 className="text-lg font-semibold text-ink">Вы ещё не играли</h2>
            <p className="mt-2 text-sm text-muted">Подключитесь к игре по коду на странице «Подключиться».</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link
                key={item.sessionId}
                href={`/history/${item.sessionId}`}
                className="hover-lift block rounded-[12px] border border-line bg-surface p-6 shadow-soft"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-ink">{item.quizTitle}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(item.endedAt).toLocaleString("ru-RU")} · {item.participantCount} участников
                    </p>
                  </div>
                  <div className="flex items-center gap-8 text-right">
                    <div>
                      <p className="text-xs uppercase tracking-[0.06em] text-faint">Место</p>
                      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
                        {item.rank} / {item.participantCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.06em] text-faint">Очки</p>
                      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">{item.totalScore}</p>
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
