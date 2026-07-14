import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rankParticipants } from "@/lib/history-queries";

type HostHistoryDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export const dynamic = "force-dynamic";

type QuestionStat = {
  questionId: string;
  order: number;
  text: string;
  totalParticipants: number;
  totalAnswered: number;
  correctCount: number;
  breakdown: Array<{ optionId: string; text: string | null; isCorrect: boolean; count: number }>;
};

export default async function HostHistoryDetailPage({ params }: HostHistoryDetailPageProps) {
  const user = await requireCurrentUser();
  const { sessionId } = await params;

  const session = await prisma.session.findFirst({
    where: { id: sessionId, hostId: user.id, status: "FINISHED" },
    select: {
      id: true,
      code: true,
      endedAt: true,
      quiz: { select: { title: true } },
    },
  });

  if (!session) {
    notFound();
  }

  const [participants, answers] = await Promise.all([
    prisma.sessionParticipant.findMany({
      where: { sessionId: session.id },
      select: { id: true, nickname: true, totalScore: true, joinedAt: true },
    }),
    prisma.participantAnswer.findMany({
      where: { sessionId: session.id },
      select: {
        selectedOptionIds: true,
        isCorrect: true,
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
    }),
  ]);

  const leaderboard = rankParticipants(participants);

  const questionStatsById = new Map<string, QuestionStat>();
  for (const answer of answers) {
    const question = answer.question;
    let stat = questionStatsById.get(question.id);

    if (!stat) {
      stat = {
        questionId: question.id,
        order: question.order,
        text: question.text,
        totalParticipants: 0,
        totalAnswered: 0,
        correctCount: 0,
        breakdown: question.answerOptions.map((option) => ({
          optionId: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          count: 0,
        })),
      };
      questionStatsById.set(question.id, stat);
    }

    stat.totalParticipants += 1;
    const selectedIds = answer.selectedOptionIds as string[];
    if (selectedIds.length > 0) {
      stat.totalAnswered += 1;
    }
    if (answer.isCorrect) {
      stat.correctCount += 1;
    }
    for (const optionId of selectedIds) {
      const bucket = stat.breakdown.find((entry) => entry.optionId === optionId);
      if (bucket) {
        bucket.count += 1;
      }
    }
  }

  const questionStats = [...questionStatsById.values()].sort((a, b) => a.order - b.order);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader user={user} />

      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-8">
        <div>
          <Link href="/host-history" prefetch={false} className="text-sm font-medium text-emerald-800">
            ← Назад к проведённым играм
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-950">{session.quiz.title}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Код {session.code} · {session.endedAt ? new Date(session.endedAt).toLocaleString("ru-RU") : ""}
          </p>
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Финальный лидерборд</h2>
          <ol className="mt-4 space-y-2">
            {leaderboard.map((participant) => (
              <li
                key={participant.id}
                className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-2 text-sm"
              >
                <span>
                  #{participant.rank} {participant.nickname}
                  {participant.rank === 1 ? " 🏆" : ""}
                </span>
                <span className="font-semibold">{participant.totalScore}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-zinc-950">Статистика по вопросам</h2>

          {questionStats.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6">
              <p className="text-sm text-zinc-600">Нет данных по ответам.</p>
            </div>
          ) : (
            questionStats.map((stat, index) => {
              const ratio = stat.totalAnswered > 0 ? Math.round((stat.correctCount / stat.totalAnswered) * 100) : 0;

              return (
                <div key={stat.questionId} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-zinc-600">Вопрос {index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-zinc-950">{stat.text}</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Правильно ответили: <span className="font-semibold text-zinc-950">{stat.correctCount}</span> из{" "}
                    {stat.totalAnswered} ответивших ({ratio}%) · {stat.totalParticipants} участников
                  </p>

                  <div className="mt-4 space-y-2">
                    {stat.breakdown.map((option) => (
                      <div
                        key={option.optionId}
                        className={`flex items-center justify-between rounded-md border p-3 text-sm ${
                          option.isCorrect ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        <span>{option.text}</span>
                        <span className="font-semibold">{option.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
