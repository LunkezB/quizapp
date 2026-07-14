import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { DeleteQuizButton } from "@/components/delete-quiz-button";
import { QuizForm } from "@/components/quiz-form";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getHostedSessions, getParticipantHistory } from "@/lib/history-queries";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 5;

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [categories, quizzes, hostedSessions, participantHistory] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.quiz.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        defaultTimeLimitSec: true,
        createdAt: true,
        category: { select: { name: true } },
        _count: { select: { questions: true } },
      },
    }),
    getHostedSessions(user.id),
    getParticipantHistory(user.id),
  ]);

  const recentHosted = hostedSessions.slice(0, RECENT_LIMIT);
  const recentPlayed = participantHistory.slice(0, RECENT_LIMIT);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-zinc-950">Мои квизы</h1>
              <p className="mt-1 text-sm text-zinc-600">Создание и редактирование контента без игровой логики.</p>
            </div>
          </div>

          {quizzes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8">
              <h2 className="text-lg font-semibold text-zinc-950">Квизов пока нет</h2>
              <p className="mt-2 text-sm text-zinc-600">Создайте первый квиз в форме справа.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <article key={quiz.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-zinc-950">{quiz.title}</h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {quiz.category?.name ?? "Без категории"} · {quiz._count.questions} вопросов ·{" "}
                        {quiz.defaultTimeLimitSec} сек.
                      </p>
                      {quiz.description ? <p className="mt-3 text-sm text-zinc-700">{quiz.description}</p> : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/quiz/${quiz.id}/edit`}
                        className="inline-flex h-10 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Открыть
                      </Link>
                      <DeleteQuizButton
                        quizId={quiz.id}
                        className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
                      >
                        Удалить
                      </DeleteQuizButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Новый квиз</h2>
          <p className="mt-1 text-sm text-zinc-600">После создания откроется редактор вопросов.</p>
          <div className="mt-5">
            <QuizForm categories={categories} />
          </div>
        </aside>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-12 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-950">Я проводил</h2>
            <Link href="/host-history" prefetch={false} className="text-sm font-medium text-emerald-800">
              Все игры →
            </Link>
          </div>

          {recentHosted.length === 0 ? (
            <p className="text-sm text-zinc-600">Вы ещё не запускали игры. Нажмите «Запустить» в редакторе квиза.</p>
          ) : (
            <ul className="space-y-2">
              {recentHosted.map((session) => (
                <li key={session.sessionId}>
                  <Link
                    href={session.status === "FINISHED" ? `/host-history/${session.sessionId}` : `/host/${session.code}`}
                    className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3 text-sm transition hover:bg-zinc-100"
                  >
                    <span>
                      {session.quizTitle}
                      {session.status !== "FINISHED" ? (
                        <span className="ml-2 text-xs font-semibold text-amber-700">
                          {session.status === "LOBBY" ? "лобби" : "идёт игра"}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-zinc-500">
                      {session.status === "FINISHED"
                        ? (session.winnerNickname ?? "—")
                        : `${session.participantCount} участников`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-950">Я играл</h2>
            <Link href="/history" prefetch={false} className="text-sm font-medium text-emerald-800">
              Все игры →
            </Link>
          </div>

          {recentPlayed.length === 0 ? (
            <p className="text-sm text-zinc-600">Вы ещё не участвовали в играх. Подключитесь по коду на «Подключиться».</p>
          ) : (
            <ul className="space-y-2">
              {recentPlayed.map((item) => (
                <li key={item.sessionId}>
                  <Link
                    href={`/history/${item.sessionId}`}
                    className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3 text-sm transition hover:bg-zinc-100"
                  >
                    <span>{item.quizTitle}</span>
                    <span className="text-zinc-500">
                      место {item.rank}/{item.participantCount} · {item.totalScore} очков
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
