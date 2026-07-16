import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireCurrentUser } from "@/lib/auth";
import { getHostedSessions } from "@/lib/history-queries";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  LOBBY: "Лобби",
  IN_PROGRESS: "Идёт игра",
  FINISHED: "Завершена",
};

export default async function HostHistoryPage() {
  const user = await requireCurrentUser();
  const sessions = await getHostedSessions(user.id);

  const finished = sessions.filter((session) => session.status === "FINISHED");
  const active = sessions.filter((session) => session.status !== "FINISHED");

  return (
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-4xl space-y-10 px-6 py-12">
        <div className="fade-up">
          <Link href="/dashboard" prefetch={false} className="text-sm font-medium text-muted transition-colors hover:text-ink">
            ← Назад в кабинет
          </Link>
          <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">Проведённые игры</h1>
          <p className="mt-2 text-sm text-muted">Сессии, которые вы запускали как ведущий.</p>
        </div>

        {active.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-faint">Активные</h2>
            {active.map((session) => (
              <Link
                key={session.sessionId}
                href={`/host/${session.code}`}
                className="hover-lift block rounded-[12px] border border-pale-yellow-ink/25 bg-pale-yellow p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold tracking-tight text-ink">{session.quizTitle}</h3>
                    <p className="mt-1 text-sm text-pale-yellow-ink">
                      Код {session.code} · {session.participantCount} участников
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-pale-yellow-ink">{STATUS_LABEL[session.status]}</span>
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-faint">Завершённые</h2>

          {finished.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-line-strong bg-surface p-10 text-center">
              <h3 className="text-lg font-semibold text-ink">Пока нет завершённых игр</h3>
              <p className="mt-2 text-sm text-muted">Запустите игру со страницы редактора квиза.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {finished.map((session) => (
                <Link
                  key={session.sessionId}
                  href={`/host-history/${session.sessionId}`}
                  className="hover-lift block rounded-[12px] border border-line bg-surface p-6 shadow-soft"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-ink">{session.quizTitle}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {session.endedAt ? new Date(session.endedAt).toLocaleString("ru-RU") : ""} ·{" "}
                        {session.participantCount} участников
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.06em] text-faint">Победитель</p>
                      <p className="mt-0.5 text-lg font-semibold text-ink">{session.winnerNickname ?? "—"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
