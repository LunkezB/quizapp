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
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <Link href={`/quiz/${quiz.id}/edit`} className="text-sm font-medium text-emerald-800">
          ← Назад к квизу
        </Link>
        <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-950">Новый вопрос</h1>
          <p className="mt-1 text-sm text-zinc-600">{quiz.title}</p>
          <div className="mt-6">
            <QuestionForm quizId={quiz.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
