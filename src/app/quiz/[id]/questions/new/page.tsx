import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { QuestionForm } from "@/components/question-form";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type NewQuestionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewQuestionPage({ params }: NewQuestionPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const quiz = await prisma.quiz.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!quiz) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <Link href={`/quiz/${quiz.id}/edit`} className="text-sm font-medium text-muted transition-colors hover:text-ink">
          ← Назад к квизу
        </Link>
        <div className="fade-up mt-4 rounded-[12px] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="font-display text-2xl text-ink sm:text-3xl">Новый вопрос</h1>
          <p className="mt-1 text-sm text-muted">{quiz.title}</p>
          <div className="mt-6">
            <QuestionForm quizId={quiz.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
