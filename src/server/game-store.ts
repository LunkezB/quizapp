import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type LeaderboardEntry,
  type PublicParticipant,
  type PublicQuestion,
  type RoomStateSnapshot,
  type RoomStatus,
} from "@/lib/realtime";

export type StoredQuestion = PublicQuestion & {
  correctOptionIds: Set<string>;
};

export type ParticipantAnswerRecord = {
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsAwarded: number;
  responseTimeMs: number;
  answeredAt: number;
};

export type RoomParticipant = {
  userId: string;
  nickname: string;
  score: number;
  connected: boolean;
  socketId: string | null;
  /** SessionParticipant.id once persisted to the database. */
  participantRecordId: string | null;
  /** Answer for the currently open/just-closed question, reset on next_question. */
  currentAnswer: ParticipantAnswerRecord | null;
  /** All answers this session, keyed by questionId — used for DB persistence bookkeeping. */
  answers: Map<string, ParticipantAnswerRecord>;
};

export type RoomState = {
  code: string;
  sessionId: string;
  quizId: string;
  hostUserId: string;
  hostSocketId: string | null;
  status: RoomStatus;
  questions: StoredQuestion[];
  currentQuestionIndex: number;
  currentDeadline: number | null;
  timerHandle: ReturnType<typeof setTimeout> | null;
  participants: Map<string, RoomParticipant>;
  createdAt: number;
};

// Server Actions run inside Next.js's bundled module graph while server.ts's
// socket handlers are loaded directly via tsx — two separate module
// instances of this file. Anchoring the registry on globalThis (same pattern
// as the Prisma singleton in db.ts) guarantees both share the one process-wide
// Map instead of each getting its own empty one.
const globalForRooms = globalThis as typeof globalThis & {
  __quizRooms?: Map<string, RoomState>;
};

const rooms = globalForRooms.__quizRooms ?? new Map<string, RoomState>();
globalForRooms.__quizRooms = rooms;

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code.toUpperCase());
}

export function setRoom(room: RoomState) {
  rooms.set(room.code, room);
}

export function deleteRoom(code: string) {
  const room = rooms.get(code.toUpperCase());
  if (room?.timerHandle) {
    clearTimeout(room.timerHandle);
  }
  rooms.delete(code.toUpperCase());
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueRoomCode(isTakenInDb: (code: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = generateRoomCode();

    if (rooms.has(candidate)) {
      continue;
    }

    if (await isTakenInDb(candidate)) {
      continue;
    }

    return candidate;
  }

  throw new Error("Failed to generate a unique room code.");
}

// Linear decay from full points at remainingMs = totalMs down to half
// points at remainingMs = 0; wrong answers score 0 (checked by the caller).
export function computePointsAwarded(points: number, remainingMs: number, totalMs: number): number {
  const clampedRemaining = Math.min(Math.max(remainingMs, 0), totalMs);
  const ratio = totalMs > 0 ? clampedRemaining / totalMs : 0;
  return Math.floor(points * (0.5 + 0.5 * ratio));
}

export function isAnswerCorrect(selectedOptionIds: string[], correctOptionIds: Set<string>): boolean {
  if (selectedOptionIds.length !== correctOptionIds.size) {
    return false;
  }

  return selectedOptionIds.every((id) => correctOptionIds.has(id));
}

function toPublicParticipant(participant: RoomParticipant): PublicParticipant {
  return {
    userId: participant.userId,
    nickname: participant.nickname,
    score: participant.score,
    connected: participant.connected,
    hasAnswered: participant.currentAnswer !== null,
  };
}

export function buildLeaderboard(room: RoomState, limit = 10): LeaderboardEntry[] {
  const sorted = [...room.participants.values()].sort((a, b) => b.score - a.score);

  return sorted.slice(0, limit).map((participant, index) => ({
    userId: participant.userId,
    nickname: participant.nickname,
    score: participant.score,
    rank: index + 1,
  }));
}

export function toPublicQuestion(question: StoredQuestion): PublicQuestion {
  return {
    id: question.id,
    order: question.order,
    type: question.type,
    text: question.text,
    imageUrl: question.imageUrl,
    timeLimitSec: question.timeLimitSec,
    points: question.points,
    options: question.options,
  };
}

export function buildRoomStateSnapshot(room: RoomState, viewerUserId: string | null): RoomStateSnapshot {
  const currentQuestion =
    room.status === "QUESTION" || room.status === "REVEAL"
      ? (room.questions[room.currentQuestionIndex] ?? null)
      : null;

  const self = viewerUserId ? room.participants.get(viewerUserId) : undefined;

  return {
    code: room.code,
    status: room.status,
    hostConnected: room.hostSocketId !== null,
    participants: [...room.participants.values()].map(toPublicParticipant),
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    currentQuestion: currentQuestion ? toPublicQuestion(currentQuestion) : null,
    deadline: room.currentDeadline,
    self: self
      ? {
          userId: self.userId,
          nickname: self.nickname,
          score: self.score,
          hasAnswered: self.currentAnswer !== null,
        }
      : null,
  };
}
