import type { Namespace, Server as SocketIOServer, Socket } from "socket.io";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { readCookie } from "@/lib/read-cookie";
import {
  hostJoinPayloadSchema,
  joinRoomPayloadSchema,
  nextQuestionPayloadSchema,
  SOCKET_EVENTS,
  startGamePayloadSchema,
  submitAnswerPayloadSchema,
  type AnswerCountUpdatePayload,
  type AnswerReceivedPayload,
  type FinalLeaderboardPayload,
  type GameOverPayload,
  type LeaderboardPayload,
  type ParticipantJoinedPayload,
  type ParticipantLeftPayload,
  type QuestionEndPayload,
  type QuestionStartPayload,
  type RoomErrorPayload,
  type ScoreUpdatePayload,
} from "@/lib/realtime";
import { prisma } from "@/lib/db";
import {
  buildLeaderboard,
  buildRoomStateSnapshot,
  computePointsAwarded,
  getRoom,
  isAnswerCorrect,
  toPublicQuestion,
  type RoomParticipant,
  type RoomState,
} from "./game-store";

type SocketData = {
  userId: string;
  displayName: string;
  role: "host" | "participant" | null;
  code: string | null;
};

function emitError(socket: Socket, message: string) {
  const payload: RoomErrorPayload = { message };
  socket.emit(SOCKET_EVENTS.roomError, payload);
}

function data(socket: Socket): SocketData {
  return socket.data as SocketData;
}

function broadcastRoomState(io: Namespace, room: RoomState) {
  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit(SOCKET_EVENTS.roomState, buildRoomStateSnapshot(room, null));
  }

  for (const participant of room.participants.values()) {
    if (participant.socketId) {
      io.to(participant.socketId).emit(SOCKET_EVENTS.roomState, buildRoomStateSnapshot(room, participant.userId));
    }
  }
}

function connectedParticipants(room: RoomState): RoomParticipant[] {
  return [...room.participants.values()].filter((participant) => participant.connected);
}

function emitAnswerCount(io: Namespace, room: RoomState) {
  const connected = connectedParticipants(room);
  const answeredCount = connected.filter((participant) => participant.currentAnswer !== null).length;
  const payload: AnswerCountUpdatePayload = {
    answeredCount,
    totalParticipants: connected.length,
  };

  if (room.hostSocketId) {
    io.to(room.hostSocketId).emit(SOCKET_EVENTS.answerCountUpdate, payload);
  }
}

async function openQuestion(io: Namespace, room: RoomState, index: number) {
  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
  }

  const question = room.questions[index];

  if (!question) {
    return;
  }

  room.currentQuestionIndex = index;
  room.status = "QUESTION";

  for (const participant of room.participants.values()) {
    participant.currentAnswer = null;
  }

  const deadline = Date.now() + question.timeLimitSec * 1000;
  room.currentDeadline = deadline;

  room.timerHandle = setTimeout(() => {
    closeQuestion(io, room).catch((error) => console.error("Failed to close question", error));
  }, question.timeLimitSec * 1000);

  const payload: QuestionStartPayload = {
    questionIndex: index,
    totalQuestions: room.questions.length,
    question: toPublicQuestion(question),
    deadline,
  };

  io.to(room.code).emit(SOCKET_EVENTS.questionStart, payload);
  broadcastRoomState(io, room);
  emitAnswerCount(io, room);

  try {
    await prisma.session.update({
      where: { id: room.sessionId },
      data: { currentQuestionIndex: index },
    });
  } catch (error) {
    console.error("Failed to persist current question index", error);
  }
}

async function closeQuestion(io: Namespace, room: RoomState) {
  if (room.status !== "QUESTION") {
    return;
  }

  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
  }

  room.status = "REVEAL";
  room.currentDeadline = null;

  const question = room.questions[room.currentQuestionIndex];

  if (!question) {
    return;
  }

  const breakdown: Record<string, number> = {};
  for (const option of question.options) {
    breakdown[option.id] = 0;
  }

  const totalMs = question.timeLimitSec * 1000;
  const persistPromises: Array<Promise<unknown>> = [];

  for (const participant of room.participants.values()) {
    const answer = participant.currentAnswer ?? {
      selectedOptionIds: [],
      isCorrect: false,
      pointsAwarded: 0,
      responseTimeMs: totalMs,
      answeredAt: Date.now(),
    };

    participant.currentAnswer = answer;
    participant.score += answer.pointsAwarded;
    participant.answers.set(question.id, answer);

    for (const optionId of answer.selectedOptionIds) {
      breakdown[optionId] = (breakdown[optionId] ?? 0) + 1;
    }

    if (participant.participantRecordId) {
      persistPromises.push(
        prisma.$transaction([
          prisma.participantAnswer.create({
            data: {
              sessionId: room.sessionId,
              participantId: participant.participantRecordId,
              questionId: question.id,
              selectedOptionIds: answer.selectedOptionIds,
              isCorrect: answer.isCorrect,
              responseTimeMs: answer.responseTimeMs,
              pointsAwarded: answer.pointsAwarded,
            },
          }),
          prisma.sessionParticipant.update({
            where: { id: participant.participantRecordId },
            data: { totalScore: { increment: answer.pointsAwarded } },
          }),
        ]),
      );
    }
  }

  try {
    await Promise.all(persistPromises);
  } catch (error) {
    console.error("Failed to persist question results", error);
  }

  const endPayload: QuestionEndPayload = {
    questionIndex: room.currentQuestionIndex,
    correctOptionIds: [...question.correctOptionIds],
    breakdown,
  };
  io.to(room.code).emit(SOCKET_EVENTS.questionEnd, endPayload);

  for (const participant of room.participants.values()) {
    if (!participant.socketId || !participant.currentAnswer) {
      continue;
    }

    const scorePayload: ScoreUpdatePayload = {
      questionIndex: room.currentQuestionIndex,
      wasCorrect: participant.currentAnswer.isCorrect,
      pointsAwarded: participant.currentAnswer.pointsAwarded,
      totalScore: participant.score,
    };
    io.to(participant.socketId).emit(SOCKET_EVENTS.scoreUpdate, scorePayload);
  }

  const leaderboardPayload: LeaderboardPayload = { entries: buildLeaderboard(room) };
  io.to(room.code).emit(SOCKET_EVENTS.leaderboard, leaderboardPayload);

  broadcastRoomState(io, room);
}

async function finishGame(io: Namespace, room: RoomState) {
  if (room.timerHandle) {
    clearTimeout(room.timerHandle);
    room.timerHandle = null;
  }

  room.status = "FINISHED";
  room.currentDeadline = null;

  try {
    await prisma.session.update({
      where: { id: room.sessionId },
      data: { status: "FINISHED", endedAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to persist session finish", error);
  }

  const gameOverPayload: GameOverPayload = {};
  io.to(room.code).emit(SOCKET_EVENTS.gameOver, gameOverPayload);

  const finalPayload: FinalLeaderboardPayload = {
    entries: buildLeaderboard(room, room.participants.size || 1),
  };
  io.to(room.code).emit(SOCKET_EVENTS.finalLeaderboard, finalPayload);

  broadcastRoomState(io, room);
}

// The game requires auth, but the default namespace also carries the
// unauthenticated ping/pong health-check demo (src/components/socket-status.tsx)
// — Socket.IO's `io.use()` middleware applies to every connection on a
// namespace, so putting the auth gate on the default namespace would reject
// that unrelated demo for guests. A dedicated namespace scopes the auth
// requirement to game traffic only; see host-game-client.tsx/play-game-client.tsx
// for the matching `io("/game", ...)` on the client.
export function registerGameHandlers(io: SocketIOServer) {
  const gameNamespace = io.of("/game");

  gameNamespace.use(async (socket, next) => {
    const token = readCookie(socket.handshake.headers.cookie, AUTH_COOKIE_NAME);
    const payload = await verifyAuthToken(token);

    if (!payload) {
      next(new Error("unauthorized"));
      return;
    }

    socket.data = {
      userId: payload.sub,
      displayName: payload.displayName,
      role: null,
      code: null,
    } satisfies SocketData;

    next();
  });

  gameNamespace.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.hostJoin, (rawPayload: unknown) => {
      const parsed = hostJoinPayloadSchema.safeParse(rawPayload);

      if (!parsed.success) {
        emitError(socket, "Некорректный запрос.");
        return;
      }

      const room = getRoom(parsed.data.code);

      if (!room) {
        emitError(socket, "Комната не найдена.");
        return;
      }

      if (room.hostUserId !== data(socket).userId) {
        emitError(socket, "Вы не являетесь ведущим этой комнаты.");
        return;
      }

      room.hostSocketId = socket.id;
      socket.data = { ...data(socket), role: "host", code: room.code } satisfies SocketData;
      socket.join(room.code);

      socket.emit(SOCKET_EVENTS.roomState, buildRoomStateSnapshot(room, null));
      broadcastRoomState(gameNamespace, room);
    });

    socket.on(SOCKET_EVENTS.joinRoom, async (rawPayload: unknown) => {
      const parsed = joinRoomPayloadSchema.safeParse(rawPayload);

      if (!parsed.success) {
        emitError(socket, "Некорректный запрос.");
        return;
      }

      const room = getRoom(parsed.data.code);

      if (!room) {
        emitError(socket, "Комната не найдена.");
        return;
      }

      const userId = data(socket).userId;
      const existing = room.participants.get(userId);

      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        socket.data = { ...data(socket), role: "participant", code: room.code } satisfies SocketData;
        socket.join(room.code);

        const joinedPayload: ParticipantJoinedPayload = {
          participant: {
            userId: existing.userId,
            nickname: existing.nickname,
            score: existing.score,
            connected: true,
            hasAnswered: existing.currentAnswer !== null,
          },
          reconnected: true,
        };
        gameNamespace.to(room.code).emit(SOCKET_EVENTS.participantJoined, joinedPayload);
        broadcastRoomState(gameNamespace, room);
        return;
      }

      if (room.status !== "LOBBY") {
        emitError(socket, "Игра уже началась, подключение новых участников недоступно.");
        return;
      }

      const nickname = parsed.data.nickname ?? data(socket).displayName;

      if (!nickname) {
        emitError(socket, "Укажите никнейм.");
        return;
      }

      let participantRecordId: string | null = null;

      try {
        const record = await prisma.sessionParticipant.upsert({
          where: { sessionId_userId: { sessionId: room.sessionId, userId } },
          create: { sessionId: room.sessionId, userId, nickname },
          update: {},
          select: { id: true },
        });
        participantRecordId = record.id;
      } catch (error) {
        console.error("Failed to persist session participant", error);
        emitError(socket, "Не удалось присоединиться к комнате.");
        return;
      }

      const participant: RoomParticipant = {
        userId,
        nickname,
        score: 0,
        connected: true,
        socketId: socket.id,
        participantRecordId,
        currentAnswer: null,
        answers: new Map(),
      };
      room.participants.set(userId, participant);

      socket.data = { ...data(socket), role: "participant", code: room.code } satisfies SocketData;
      socket.join(room.code);

      const joinedPayload: ParticipantJoinedPayload = {
        participant: {
          userId: participant.userId,
          nickname: participant.nickname,
          score: participant.score,
          connected: true,
          hasAnswered: false,
        },
        reconnected: false,
      };
      gameNamespace.to(room.code).emit(SOCKET_EVENTS.participantJoined, joinedPayload);
      broadcastRoomState(gameNamespace, room);
    });

    socket.on(SOCKET_EVENTS.startGame, async (rawPayload: unknown) => {
      const parsed = startGamePayloadSchema.safeParse(rawPayload);

      if (!parsed.success) {
        emitError(socket, "Некорректный запрос.");
        return;
      }

      const room = getRoom(parsed.data.code);

      if (!room || room.hostUserId !== data(socket).userId) {
        emitError(socket, "Комната не найдена.");
        return;
      }

      if (room.status !== "LOBBY") {
        emitError(socket, "Игра уже запущена.");
        return;
      }

      if (room.participants.size === 0) {
        emitError(socket, "Нужен минимум один участник.");
        return;
      }

      try {
        await prisma.session.update({
          where: { id: room.sessionId },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        });
      } catch (error) {
        console.error("Failed to persist session start", error);
      }

      await openQuestion(gameNamespace, room, 0);
    });

    socket.on(SOCKET_EVENTS.nextQuestion, async (rawPayload: unknown) => {
      const parsed = nextQuestionPayloadSchema.safeParse(rawPayload);

      if (!parsed.success) {
        emitError(socket, "Некорректный запрос.");
        return;
      }

      const room = getRoom(parsed.data.code);

      if (!room || room.hostUserId !== data(socket).userId) {
        emitError(socket, "Комната не найдена.");
        return;
      }

      if (room.status === "LOBBY") {
        emitError(socket, "Игра ещё не начата.");
        return;
      }

      if (room.status === "QUESTION") {
        await closeQuestion(gameNamespace, room);
        return;
      }

      if (room.status === "REVEAL") {
        const nextIndex = room.currentQuestionIndex + 1;

        if (nextIndex < room.questions.length) {
          await openQuestion(gameNamespace, room, nextIndex);
        } else {
          await finishGame(gameNamespace, room);
        }
      }
    });

    socket.on(SOCKET_EVENTS.submitAnswer, (rawPayload: unknown) => {
      const parsed = submitAnswerPayloadSchema.safeParse(rawPayload);

      if (!parsed.success) {
        const payload: AnswerReceivedPayload = { accepted: false, reason: "Некорректные данные." };
        socket.emit(SOCKET_EVENTS.answerReceived, payload);
        return;
      }

      const room = getRoom(parsed.data.code);
      const userId = data(socket).userId;

      const reject = (reason: string) => {
        const payload: AnswerReceivedPayload = { accepted: false, reason };
        socket.emit(SOCKET_EVENTS.answerReceived, payload);
      };

      if (!room) {
        reject("Комната не найдена.");
        return;
      }

      const participant = room.participants.get(userId);

      if (!participant) {
        reject("Вы не участник этой комнаты.");
        return;
      }

      if (room.status !== "QUESTION") {
        reject("Вопрос закрыт.");
        return;
      }

      const question = room.questions[room.currentQuestionIndex];

      if (!question || question.id !== parsed.data.questionId) {
        reject("Вопрос устарел.");
        return;
      }

      if (participant.currentAnswer !== null) {
        reject("Ответ уже принят.");
        return;
      }

      const now = Date.now();

      if (room.currentDeadline !== null && now > room.currentDeadline) {
        reject("Время истекло.");
        return;
      }

      const validOptionIds = new Set(question.options.map((option) => option.id));
      const selectedOptionIds = [...new Set(parsed.data.selectedOptionIds)];

      if (!selectedOptionIds.every((id) => validOptionIds.has(id))) {
        reject("Некорректный вариант ответа.");
        return;
      }

      const totalMs = question.timeLimitSec * 1000;
      const remainingMs = room.currentDeadline !== null ? room.currentDeadline - now : 0;
      const isCorrect = isAnswerCorrect(selectedOptionIds, question.correctOptionIds);
      const pointsAwarded = isCorrect ? computePointsAwarded(question.points, remainingMs, totalMs) : 0;
      const responseTimeMs = Math.max(0, totalMs - Math.max(remainingMs, 0));

      participant.currentAnswer = {
        selectedOptionIds,
        isCorrect,
        pointsAwarded,
        responseTimeMs,
        answeredAt: now,
      };

      const acceptedPayload: AnswerReceivedPayload = { accepted: true };
      socket.emit(SOCKET_EVENTS.answerReceived, acceptedPayload);
      emitAnswerCount(gameNamespace, room);

      const connected = connectedParticipants(room);
      const answeredCount = connected.filter((p) => p.currentAnswer !== null).length;

      if (connected.length > 0 && answeredCount === connected.length) {
        closeQuestion(gameNamespace, room).catch((error) => console.error("Failed to auto-close question", error));
      }
    });

    socket.on("disconnect", () => {
      const socketData = data(socket);

      if (!socketData?.code) {
        return;
      }

      const room = getRoom(socketData.code);

      if (!room) {
        return;
      }

      if (socketData.role === "host" && room.hostSocketId === socket.id) {
        room.hostSocketId = null;
        broadcastRoomState(gameNamespace, room);
        return;
      }

      if (socketData.role === "participant") {
        const participant = room.participants.get(socketData.userId);

        if (participant && participant.socketId === socket.id) {
          participant.connected = false;
          participant.socketId = null;

          const leftPayload: ParticipantLeftPayload = { userId: participant.userId };
          gameNamespace.to(room.code).emit(SOCKET_EVENTS.participantLeft, leftPayload);

          if (room.hostSocketId) {
            gameNamespace.to(room.hostSocketId).emit(SOCKET_EVENTS.roomState, buildRoomStateSnapshot(room, null));
          }
        }
      }
    });
  });
}
