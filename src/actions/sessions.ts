"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniqueRoomCode, setRoom, type RoomState, type StoredQuestion } from "@/server/game-store";

export async function startSessionAction(quizId: string): Promise<{ code: string }> {
  const user = await requireCurrentUser();

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, ownerId: user.id },
    select: {
      id: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          type: true,
          text: true,
          imageUrl: true,
          timeLimitSec: true,
          points: true,
          answerOptions: {
            orderBy: { order: "asc" },
            select: { id: true, text: true, imageUrl: true, isCorrect: true },
          },
        },
      },
      defaultTimeLimitSec: true,
    },
  });

  if (!quiz) {
    throw new Error("Квиз не найден или у вас нет доступа.");
  }

  if (quiz.questions.length === 0) {
    throw new Error("В квизе нет вопросов — добавьте хотя бы один перед запуском.");
  }

  const code = await generateUniqueRoomCode(async (candidate) => {
    const existing = await prisma.session.findUnique({ where: { code: candidate }, select: { id: true } });
    return existing !== null;
  });

  const session = await prisma.session.create({
    data: {
      quizId: quiz.id,
      hostId: user.id,
      code,
      status: "LOBBY",
      currentQuestionIndex: -1,
    },
    select: { id: true },
  });

  const questions: StoredQuestion[] = quiz.questions.map((question) => ({
    id: question.id,
    order: question.order,
    type: question.type,
    text: question.text,
    imageUrl: question.imageUrl,
    timeLimitSec: question.timeLimitSec ?? quiz.defaultTimeLimitSec,
    points: question.points,
    options: question.answerOptions.map((option) => ({
      id: option.id,
      text: option.text,
      imageUrl: option.imageUrl,
    })),
    correctOptionIds: new Set(question.answerOptions.filter((option) => option.isCorrect).map((option) => option.id)),
  }));

  const room: RoomState = {
    code,
    sessionId: session.id,
    quizId: quiz.id,
    hostUserId: user.id,
    hostSocketId: null,
    status: "LOBBY",
    questions,
    currentQuestionIndex: -1,
    currentDeadline: null,
    timerHandle: null,
    participants: new Map(),
    createdAt: Date.now(),
  };

  setRoom(room);

  return { code };
}
