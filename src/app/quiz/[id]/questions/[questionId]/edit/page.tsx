import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { QuestionForm } from "@/components/question-form";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type EditQuestionPageProps = {
  params: Promise<{
    id: string;
    questionId: string;
  }>;
};

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
  const user = await requireCurrentUser();
  const { id, questionId } = await params;
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      quiz: {
        id,
        ownerId: user.id,
      },
    },
    select: {
      id: true,
      type: true,
      text: true,
      imageUrl: true,
      timeLimitSec: true,
      points: true,
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
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
  });

  if (!question) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <Link
          href={`/quiz/${question.quiz.id}/edit`}
          className="text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          ← Назад к квизу
        </Link>
        <div className="fade-up mt-4 rounded-[12px] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-2xl text-ink sm:text-3xl">Редактирование вопроса</h1>
          <p className="mt-1 text-sm text-muted">{question.quiz.title}</p>
          <div className="mt-6">
            <QuestionForm quizId={question.quiz.id} question={question} />
          </div>
        </div>
      </div>
    </main>
  );
}
