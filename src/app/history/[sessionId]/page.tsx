import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rankParticipants } from "@/lib/history-queries";

type HistoryDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({ params }: HistoryDetailPageProps) {
  const user = await requireCurrentUser();
  const { sessionId } = await params;

  const participant = await prisma.sessionParticipant.findFirst({
    where: { sessionId, userId: user.id },
    select: {
      id: true,
      nickname: true,
      totalScore: true,
      joinedAt: true,
      session: {
        select: {
          status: true,
          endedAt: true,
          quiz: { select: { title: true } },
        },
      },
    },
  });

  if (!participant || participant.session.status !== "FINISHED") {
    notFound();
  }

  const [allParticipants, answers] = await Promise.all([
    prisma.sessionParticipant.findMany({
      where: { sessionId },
      select: { id: true, totalScore: true, joinedAt: true },
    }),
    prisma.participantAnswer.findMany({
      where: { participantId: participant.id },
      select: {
        selectedOptionIds: true,
        isCorrect: true,
        pointsAwarded: true,
        question: {
          select: {
            id: true,
            order: true,
            text: true,
            answerOptions: {
              select: { id: true, text: true, isCorrect: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { question: { order: "asc" } },
    }),
  ]);

  const ranked = rankParticipants(allParticipants);
  const self = ranked.find((entry) => entry.id === participant.id);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
        <div>
          <Link href="/history" prefetch={false} className="text-sm font-medium text-emerald-800">
            ← Назад к истории
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-950">{participant.session.quiz.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {participant.session.endedAt ? new Date(participant.session.endedAt).toLocaleString("ru-RU") : ""}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Место</p>
            <p className="text-2xl font-bold text-emerald-800">
              {self?.rank ?? "—"} / {allParticipants.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Очки</p>
            <p className="text-2xl font-bold text-zinc-950">{participant.totalScore}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Никнейм</p>
            <p className="text-2xl font-bold text-zinc-950">{participant.nickname}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-zinc-950">Ответы по вопросам</h2>

          {answers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6">
              <p className="text-sm text-zinc-600">Нет данных по ответам.</p>
            </div>
          ) : (
            answers.map((answer, index) => {
              const selectedIds = new Set(answer.selectedOptionIds as string[]);
              const selectedOptions = answer.question.answerOptions.filter((option) => selectedIds.has(option.id));
              const correctOptions = answer.question.answerOptions.filter((option) => option.isCorrect);

              return (
                <div key={answer.question.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-600">Вопрос {index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold text-zinc-950">{answer.question.text}</h3>
                    </div>
                    <span
                      className={`inline-flex h-8 shrink-0 items-center rounded-md px-3 text-sm font-semibold ${
                        answer.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {answer.isCorrect ? "Верно" : "Неверно"} · +{answer.pointsAwarded}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-zinc-700">
                    Ваш ответ:{" "}
                    <span className="font-medium">
                      {selectedOptions.length > 0 ? selectedOptions.map((option) => option.text).join(", ") : "нет ответа"}
                    </span>
                  </p>
                  {!answer.isCorrect ? (
                    <p className="mt-1 text-sm text-zinc-600">
                      Правильный ответ: <span className="font-medium">{correctOptions.map((option) => option.text).join(", ")}</span>
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
