"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, actionSuccess, formDataToObject, type ActionState, validationError } from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { quizFormSchema } from "@/lib/validation";

export async function createQuizAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCurrentUser();
  const parsed = quizFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const quiz = await prisma.quiz.create({
    data: {
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      categoryId: parsed.data.categoryId ?? null,
      defaultTimeLimitSec: parsed.data.defaultTimeLimitSec,
    },
    select: { id: true },
  });

  revalidatePath("/dashboard");
  redirect(`/quiz/${quiz.id}/edit`);
}

export async function updateQuizAction(
  quizId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireCurrentUser();
  const parsed = quizFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const result = await prisma.quiz.updateMany({
    where: {
      id: quizId,
      ownerId: user.id,
    },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      categoryId: parsed.data.categoryId ?? null,
      defaultTimeLimitSec: parsed.data.defaultTimeLimitSec,
    },
  });

  if (result.count === 0) {
    return actionError("Квиз не найден или у вас нет доступа.");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/quiz/${quizId}/edit`);
  return actionSuccess("Квиз сохранен.");
}

export async function deleteQuizAction(quizId: string) {
  const user = await requireCurrentUser();

  await prisma.quiz.deleteMany({
    where: {
      id: quizId,
      ownerId: user.id,
    },
  });

  revalidatePath("/dashboard");
}
