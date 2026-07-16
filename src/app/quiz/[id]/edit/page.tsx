import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuestionAction, moveQuestionAction } from "@/actions/questions";
import { AppHeader } from "@/components/app-header";
import { DeleteQuizButton } from "@/components/delete-quiz-button";
import { QuizForm } from "@/components/quiz-form";
import { StartSessionButton } from "@/components/start-session-button";
import { badgeClassName } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type EditQuizPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditQuizPage({ params }: EditQuizPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;

  const [categories, quiz] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.quiz.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        categoryId: true,
        defaultTimeLimitSec: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            type: true,
            text: true,
            timeLimitSec: true,
            points: true,
            answerOptions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                text: true,
                imageUrl: true,
                isCorrect: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!quiz) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-6xl space-y-10 px-6 py-12">
        <div className="fade-up flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/dashboard" prefetch={false} className="text-sm font-medium text-muted transition-colors hover:text-ink">
              ← Назад в кабинет
            </Link>
            <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{quiz.title}</h1>
            <p className="mt-2 text-sm text-muted">Редактор метаданных и вопросов.</p>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <StartSessionButton quizId={quiz.id} disabled={quiz.questions.length === 0} className={buttonClassName("primary", "md")} />
            <DeleteQuizButton quizId={quiz.id} className={buttonClassName("danger", "md")}>
              Удалить квиз
            </DeleteQuizButton>
          </div>
        </div>

        <section className={`${cardClassName} p-6 sm:p-8`}>
          <h2 className="mb-6 text-xl font-semibold tracking-tight text-ink">Метаданные</h2>
          <QuizForm categories={categories} quiz={quiz} />
        </section>

        <section className={`${cardClassName} p-6 sm:p-8`}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">Вопросы</h2>
              <p className="mt-1 text-sm text-muted">Порядок задается кнопками вверх/вниз.</p>
            </div>
            <Link href={`/quiz/${quiz.id}/questions/new`} className={buttonClassName("primary", "md")}>
              Добавить вопрос
            </Link>
          </div>

          {quiz.questions.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-line-strong bg-surface-muted p-8 text-center">
              <h3 className="font-semibold text-ink">Вопросов пока нет</h3>
              <p className="mt-1 text-sm text-muted">Добавьте SINGLE или MULTIPLE вопрос с вариантами ответа.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quiz.questions.map((question, index) => (
                <article key={question.id} className="rounded-[12px] border border-line bg-surface-muted p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                        <span className="font-mono text-faint">#{index + 1}</span>
                        <span className={badgeClassName(question.type === "SINGLE" ? "blue" : "green")}>{question.type}</span>
                        <span>
                          {question.points} очков ·{" "}
                          {question.timeLimitSec ? `${question.timeLimitSec} сек.` : "дефолтное время"}
                        </span>
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">{question.text}</h3>
                      <p className="mt-2 text-sm text-muted">
                        Верных вариантов: {question.answerOptions.filter((option) => option.isCorrect).length} из{" "}
                        {question.answerOptions.length}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={moveQuestionAction.bind(null, quiz.id, question.id, "up")}>
                        <button type="submit" disabled={index === 0} className={buttonClassName("secondary", "sm", "px-3")}>
                          ↑
                        </button>
                      </form>
                      <form action={moveQuestionAction.bind(null, quiz.id, question.id, "down")}>
                        <button
                          type="submit"
                          disabled={index === quiz.questions.length - 1}
                          className={buttonClassName("secondary", "sm", "px-3")}
                        >
                          ↓
                        </button>
                      </form>
                      <Link href={`/quiz/${quiz.id}/questions/${question.id}/edit`} className={buttonClassName("secondary", "sm")}>
                        Редактировать
                      </Link>
                      <form action={deleteQuestionAction.bind(null, quiz.id, question.id)}>
                        <button type="submit" className={buttonClassName("secondary", "sm")}>
                          Удалить
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
