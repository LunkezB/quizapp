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
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-8">
        <div>
          <Link href="/dashboard" prefetch={false} className="text-sm font-medium text-emerald-800">
            ← Назад в кабинет
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-950">Проведённые игры</h1>
          <p className="mt-1 text-sm text-zinc-600">Сессии, которые вы запускали как ведущий.</p>
        </div>

        {active.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-950">Активные</h2>
            {active.map((session) => (
              <Link
                key={session.sessionId}
                href={`/host/${session.code}`}
                className="block rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm transition hover:border-amber-400"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-950">{session.quizTitle}</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      Код {session.code} · {session.participantCount} участников
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-800">{STATUS_LABEL[session.status]}</span>
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-950">Завершённые</h2>

          {finished.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8">
              <h3 className="text-lg font-semibold text-zinc-950">Пока нет завершённых игр</h3>
              <p className="mt-2 text-sm text-zinc-600">Запустите игру со страницы редактора квиза.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {finished.map((session) => (
                <Link
                  key={session.sessionId}
                  href={`/host-history/${session.sessionId}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-emerald-300"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-950">{session.quizTitle}</h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {session.endedAt ? new Date(session.endedAt).toLocaleString("ru-RU") : ""} ·{" "}
                        {session.participantCount} участников
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Победитель</p>
                      <p className="text-lg font-bold text-emerald-800">{session.winnerNickname ?? "—"}</p>
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
