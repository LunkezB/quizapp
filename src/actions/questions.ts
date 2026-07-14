"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, formDataToObject, type ActionState, validationError } from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { questionFormSchema, type QuestionFormInput } from "@/lib/validation";

type Direction = "up" | "down";

export async function createQuestionAction(
  quizId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCurrentUser();
  const parsed = questionFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const ownsQuiz = await userOwnsQuiz(quizId, user.id);

  if (!ownsQuiz) {
    return actionError("Квиз не найден или у вас нет доступа.");
  }

  const maxOrder = await prisma.question.aggregate({
    where: { quizId },
    _max: { order: true },
  });

  await prisma.question.create({
    data: {
      quizId,
      order: (maxOrder._max.order ?? -1) + 1,
      ...questionData(parsed.data),
      answerOptions: {
        create: answerOptionsData(parsed.data),
      },
    },
  });

  revalidatePath(`/quiz/${quizId}/edit`);
  redirect(`/quiz/${quizId}/edit`);
}

export async function updateQuestionAction(
  quizId: string,
  questionId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCurrentUser();
  const parsed = questionFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      quiz: {
        id: quizId,
        ownerId: user.id,
      },
    },
    select: { id: true },
  });

  if (!question) {
    return actionError("Вопрос не найден или у вас нет доступа.");
  }

  await prisma.question.update({
    where: { id: questionId },
    data: {
      ...questionData(parsed.data),
      answerOptions: {
        deleteMany: {},
        create: answerOptionsData(parsed.data),
      },
    },
  });

  revalidatePath(`/quiz/${quizId}/edit`);
  redirect(`/quiz/${quizId}/edit`);
}

export async function deleteQuestionAction(quizId: string, questionId: string) {
  const user = await requireCurrentUser();

  const deleted = await prisma.$transaction(async (transaction) => {
    const question = await transaction.question.findFirst({
      where: {
        id: questionId,
        quiz: {
          id: quizId,
          ownerId: user.id,
        },
      },
      select: { id: true },
    });

    if (!question) {
      return false;
    }

    await transaction.question.delete({
      where: { id: questionId },
    });

    await normalizeQuestionOrder(transaction, quizId);
    return true;
  });

  if (deleted) {
    revalidatePath(`/quiz/${quizId}/edit`);
  }

  redirect(`/quiz/${quizId}/edit`);
}

export async function moveQuestionAction(quizId: string, questionId: string, direction: Direction) {
  const user = await requireCurrentUser();

  await prisma.$transaction(async (transaction) => {
    const current = await transaction.question.findFirst({
      where: {
        id: questionId,
        quiz: {
          id: quizId,
          ownerId: user.id,
        },
      },
      select: {
        id: true,
        order: true,
      },
    });

    if (!current) {
      return;
    }

    const neighbor = await transaction.question.findFirst({
      where: {
        quizId,
        order: direction === "up" ? { lt: current.order } : { gt: current.order },
      },
      orderBy: {
        order: direction === "up" ? "desc" : "asc",
      },
      select: {
        id: true,
        order: true,
      },
    });

    if (!neighbor) {
      return;
    }

    const temporaryOrder = -1_000_000;

    await transaction.question.update({
      where: { id: current.id },
      data: { order: temporaryOrder },
    });
    await transaction.question.update({
      where: { id: neighbor.id },
      data: { order: current.order },
    });
    await transaction.question.update({
      where: { id: current.id },
      data: { order: neighbor.order },
    });
  });

  revalidatePath(`/quiz/${quizId}/edit`);
}

async function userOwnsQuiz(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      ownerId: userId,
    },
    select: { id: true },
  });

  return Boolean(quiz);
}

function questionData(question: QuestionFormInput) {
  return {
    type: question.type,
    text: question.text,
    imageUrl: question.imageUrl ?? null,
    timeLimitSec: question.timeLimitSec ?? null,
    points: question.points,
  };
}

function answerOptionsData(question: QuestionFormInput) {
  return question.options.map((option, index) => ({
    order: index,
    text: option.text ?? null,
    imageUrl: option.imageUrl ?? null,
    isCorrect: option.isCorrect,
  }));
}

async function normalizeQuestionOrder(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  quizId: string,
) {
  const questions = await transaction.question.findMany({
    where: { quizId },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  for (const [index, question] of questions.entries()) {
    await transaction.question.update({
      where: { id: question.id },
      data: { order: index },
    });
  }
}
