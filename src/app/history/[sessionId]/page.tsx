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
    <main className="min-h-screen bg-canvas">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
        <div className="fade-up">
          <Link href="/history" prefetch={false} className="text-sm font-medium text-muted transition-colors hover:text-ink">
            ← Назад к истории
          </Link>
          <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{participant.session.quiz.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {participant.session.endedAt ? new Date(participant.session.endedAt).toLocaleString("ru-RU") : ""}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line shadow-soft">
          <div className="bg-surface p-5 text-center">
            <p className="text-xs uppercase tracking-[0.06em] text-faint">Место</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
              {self?.rank ?? "—"} / {allParticipants.length}
            </p>
          </div>
          <div className="bg-surface p-5 text-center">
            <p className="text-xs uppercase tracking-[0.06em] text-faint">Очки</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{participant.totalScore}</p>
          </div>
          <div className="bg-surface p-5 text-center">
            <p className="text-xs uppercase tracking-[0.06em] text-faint">Никнейм</p>
            <p className="mt-1 truncate text-2xl font-semibold text-ink">{participant.nickname}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Ответы по вопросам</h2>

          {answers.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-line-strong bg-surface p-6">
              <p className="text-sm text-muted">Нет данных по ответам.</p>
            </div>
          ) : (
            answers.map((answer, index) => {
              const selectedIds = new Set(answer.selectedOptionIds as string[]);
              const selectedOptions = answer.question.answerOptions.filter((option) => selectedIds.has(option.id));
              const correctOptions = answer.question.answerOptions.filter((option) => option.isCorrect);

              return (
                <div key={answer.question.id} className="rounded-[12px] border border-line bg-surface p-6 shadow-soft">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted">Вопрос {index + 1}</p>
                      <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">{answer.question.text}</h3>
                    </div>
                    <span
                      className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium uppercase tracking-[0.05em] ${
                        answer.isCorrect ? "bg-pale-green text-pale-green-ink" : "bg-pale-red text-pale-red-ink"
                      }`}
                    >
                      {answer.isCorrect ? "Верно" : "Неверно"} · +{answer.pointsAwarded}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-ink-soft">
                    Ваш ответ:{" "}
                    <span className="font-medium text-ink">
                      {selectedOptions.length > 0 ? selectedOptions.map((option) => option.text).join(", ") : "нет ответа"}
                    </span>
                  </p>
                  {!answer.isCorrect ? (
                    <p className="mt-1 text-sm text-muted">
                      Правильный ответ:{" "}
                      <span className="font-medium text-ink">{correctOptions.map((option) => option.text).join(", ")}</span>
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
