import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { DeleteQuizButton } from "@/components/delete-quiz-button";
import { QuizForm } from "@/components/quiz-form";
import { badgeClassName } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
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
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="fade-up">
          <div className="mb-6">
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Мои квизы</h1>
            <p className="mt-2 text-sm text-muted">Создание и редактирование контента без игровой логики.</p>
          </div>

          {quizzes.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-line-strong bg-surface p-10 text-center">
              <h2 className="text-lg font-semibold text-ink">Квизов пока нет</h2>
              <p className="mt-2 text-sm text-muted">Создайте первый квиз в форме справа.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <article key={quiz.id} className={`${cardClassName} hover-lift p-6`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-ink">{quiz.title}</h2>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <span className={badgeClassName("neutral")}>{quiz.category?.name ?? "Без категории"}</span>
                        <span>
                          {quiz._count.questions} вопросов · {quiz.defaultTimeLimitSec} сек.
                        </span>
                      </p>
                      {quiz.description ? <p className="mt-3 text-sm text-ink-soft">{quiz.description}</p> : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Link href={`/quiz/${quiz.id}/edit`} className={buttonClassName("primary", "md")}>
                        Открыть
                      </Link>
                      <DeleteQuizButton quizId={quiz.id} className={buttonClassName("secondary", "md")}>
                        Удалить
                      </DeleteQuizButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className={`${cardClassName} fade-up h-fit p-6`}>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Новый квиз</h2>
          <p className="mt-1 text-sm text-muted">После создания откроется редактор вопросов.</p>
          <div className="mt-6">
            <QuizForm categories={categories} />
          </div>
        </aside>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 lg:grid-cols-2">
        <section className={`${cardClassName} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Я проводил</h2>
            <Link href="/host-history" prefetch={false} className="text-sm font-medium text-ink underline underline-offset-4">
              Все игры →
            </Link>
          </div>

          {recentHosted.length === 0 ? (
            <p className="text-sm text-muted">Вы ещё не запускали игры. Нажмите «Запустить» в редакторе квиза.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentHosted.map((session) => (
                <li key={session.sessionId}>
                  <Link
                    href={session.status === "FINISHED" ? `/host-history/${session.sessionId}` : `/host/${session.code}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-[8px] px-2 py-3 text-sm transition-colors hover:bg-surface-muted"
                  >
                    <span className="flex items-center gap-2 text-ink">
                      {session.quizTitle}
                      {session.status !== "FINISHED" ? (
                        <span className={badgeClassName("yellow")}>
                          {session.status === "LOBBY" ? "лобби" : "идёт игра"}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-muted">
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

        <section className={`${cardClassName} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Я играл</h2>
            <Link href="/history" prefetch={false} className="text-sm font-medium text-ink underline underline-offset-4">
              Все игры →
            </Link>
          </div>

          {recentPlayed.length === 0 ? (
            <p className="text-sm text-muted">Вы ещё не участвовали в играх. Подключитесь по коду на «Подключиться».</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentPlayed.map((item) => (
                <li key={item.sessionId}>
                  <Link
                    href={`/history/${item.sessionId}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-[8px] px-2 py-3 text-sm transition-colors hover:bg-surface-muted"
                  >
                    <span className="text-ink">{item.quizTitle}</span>
                    <span className="shrink-0 text-muted">
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
