import { prisma } from "@/lib/db";

export type RankedParticipant<T> = T & { rank: number };

/**
 * Same ordering the live leaderboard uses (score desc, then join order for
 * ties) so historical ranks always match what players saw during the game.
 */
export function rankParticipants<T extends { totalScore: number; joinedAt: Date }>(
  participants: T[],
): Array<RankedParticipant<T>> {
  return [...participants]
    .sort((a, b) => b.totalScore - a.totalScore || a.joinedAt.getTime() - b.joinedAt.getTime())
    .map((participant, index) => ({ ...participant, rank: index + 1 }));
}

export type ParticipantHistoryItem = {
  sessionId: string;
  quizTitle: string;
  endedAt: Date;
  rank: number;
  totalScore: number;
  participantCount: number;
};

export async function getParticipantHistory(userId: string): Promise<ParticipantHistoryItem[]> {
  const participations = await prisma.sessionParticipant.findMany({
    where: { userId, session: { status: "FINISHED" } },
    select: {
      sessionId: true,
      totalScore: true,
      joinedAt: true,
      session: {
        select: {
          endedAt: true,
          quiz: { select: { title: true } },
        },
      },
    },
    orderBy: { session: { endedAt: "desc" } },
  });

  if (participations.length === 0) {
    return [];
  }

  const sessionIds = participations.map((participation) => participation.sessionId);

  const allParticipants = await prisma.sessionParticipant.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { sessionId: true, userId: true, totalScore: true, joinedAt: true },
  });

  const bySession = new Map<string, typeof allParticipants>();
  for (const participant of allParticipants) {
    const bucket = bySession.get(participant.sessionId);
    if (bucket) {
      bucket.push(participant);
    } else {
      bySession.set(participant.sessionId, [participant]);
    }
  }

  return participations.map((participation) => {
    const sessionParticipants = bySession.get(participation.sessionId) ?? [];
    const ranked = rankParticipants(sessionParticipants);
    const self = ranked.find((participant) => participant.userId === userId);

    return {
      sessionId: participation.sessionId,
      quizTitle: participation.session.quiz.title,
      endedAt: participation.session.endedAt!,
      rank: self?.rank ?? ranked.length,
      totalScore: participation.totalScore,
      participantCount: sessionParticipants.length,
    };
  });
}

export type HostedSessionSummary = {
  sessionId: string;
  code: string;
  quizTitle: string;
  status: "LOBBY" | "IN_PROGRESS" | "FINISHED";
  createdAt: Date;
  endedAt: Date | null;
  participantCount: number;
  winnerNickname: string | null;
};

export async function getHostedSessions(hostId: string): Promise<HostedSessionSummary[]> {
  const sessions = await prisma.session.findMany({
    where: { hostId },
    select: {
      id: true,
      code: true,
      status: true,
      createdAt: true,
      endedAt: true,
      quiz: { select: { title: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const finishedIds = sessions.filter((session) => session.status === "FINISHED").map((session) => session.id);

  const winners = new Map<string, string>();

  if (finishedIds.length > 0) {
    const participants = await prisma.sessionParticipant.findMany({
      where: { sessionId: { in: finishedIds } },
      select: { sessionId: true, nickname: true, totalScore: true, joinedAt: true },
    });

    const bySession = new Map<string, typeof participants>();
    for (const participant of participants) {
      const bucket = bySession.get(participant.sessionId);
      if (bucket) {
        bucket.push(participant);
      } else {
        bySession.set(participant.sessionId, [participant]);
      }
    }

    for (const [sessionId, sessionParticipants] of bySession) {
      const ranked = rankParticipants(sessionParticipants);
      const winner = ranked.find((participant) => participant.rank === 1);
      if (winner) {
        winners.set(sessionId, winner.nickname);
      }
    }
  }

  return sessions.map((session) => ({
    sessionId: session.id,
    code: session.code,
    quizTitle: session.quiz.title,
    status: session.status,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
    participantCount: session._count.participants,
    winnerNickname: winners.get(session.id) ?? null,
  }));
}
