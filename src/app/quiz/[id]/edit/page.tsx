import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuestionAction, moveQuestionAction } from "@/actions/questions";
import { AppHeader } from "@/components/app-header";
import { DeleteQuizButton } from "@/components/delete-quiz-button";
import { QuizForm } from "@/components/quiz-form";
import { StartSessionButton } from "@/components/start-session-button";
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
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/dashboard" prefetch={false} className="text-sm font-medium text-emerald-800">
              ← Назад в кабинет
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-950">{quiz.title}</h1>
            <p className="mt-1 text-sm text-zinc-600">Редактор метаданных и вопросов.</p>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <StartSessionButton
              quizId={quiz.id}
              disabled={quiz.questions.length === 0}
              className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
            />
            <DeleteQuizButton
              quizId={quiz.id}
              className="h-10 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
            >
              Удалить квиз
            </DeleteQuizButton>
          </div>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-zinc-950">Метаданные</h2>
          <QuizForm categories={categories} quiz={quiz} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">Вопросы</h2>
              <p className="mt-1 text-sm text-zinc-600">Порядок задается кнопками вверх/вниз.</p>
            </div>
            <Link
              href={`/quiz/${quiz.id}/questions/new`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Добавить вопрос
            </Link>
          </div>

          {quiz.questions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6">
              <h3 className="font-semibold text-zinc-950">Вопросов пока нет</h3>
              <p className="mt-1 text-sm text-zinc-600">Добавьте SINGLE или MULTIPLE вопрос с вариантами ответа.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quiz.questions.map((question, index) => (
                <article key={question.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-600">
                        #{index + 1} · {question.type} · {question.points} очков ·{" "}
                        {question.timeLimitSec ? `${question.timeLimitSec} сек.` : "дефолтное время"}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-zinc-950">{question.text}</h3>
                      <p className="mt-2 text-sm text-zinc-600">
                        Верных вариантов: {question.answerOptions.filter((option) => option.isCorrect).length} из{" "}
                        {question.answerOptions.length}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <form action={moveQuestionAction.bind(null, quiz.id, question.id, "up")}>
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="h-9 rounded-md border border-zinc-300 px-3 text-sm text-zinc-800 transition hover:bg-white disabled:cursor-not-allowed disabled:text-zinc-400"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveQuestionAction.bind(null, quiz.id, question.id, "down")}>
                        <button
                          type="submit"
                          disabled={index === quiz.questions.length - 1}
                          className="h-9 rounded-md border border-zinc-300 px-3 text-sm text-zinc-800 transition hover:bg-white disabled:cursor-not-allowed disabled:text-zinc-400"
                        >
                          ↓
                        </button>
                      </form>
                      <Link
                        href={`/quiz/${quiz.id}/questions/${question.id}/edit`}
                        className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 transition hover:bg-white"
                      >
                        Редактировать
                      </Link>
                      <form action={deleteQuestionAction.bind(null, quiz.id, question.id)}>
                        <button
                          type="submit"
                          className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 transition hover:bg-white"
                        >
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
