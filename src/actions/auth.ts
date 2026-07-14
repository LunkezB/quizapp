"use server";

import { compare, hash, hashSync } from "bcryptjs";
import { redirect } from "next/navigation";
import { actionError, formDataToObject, type ActionState, validationError } from "@/lib/action-state";
import { clearAuthCookie, setAuthCookie, type CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginSchema, registerSchema } from "@/lib/validation";

const DUMMY_PASSWORD_HASH = hashSync("invalid-password", 12);

export async function registerAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const passwordHash = await hash(parsed.data.password, 12);

  let user: CurrentUser;

  try {
    user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        displayName: parsed.data.displayName,
        role: parsed.data.role,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return actionError("Пользователь с таким email уже существует.", {
        email: ["Email уже занят."],
      });
    }

    return actionError("Не удалось зарегистрироваться. Попробуйте позже.");
  }

  await setAuthCookie(user);
  redirect("/dashboard");
}

export async function loginAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true,
    },
  });

  const passwordMatches = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    return actionError("Неверный email или пароль.");
  }

  await setAuthCookie({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  });
  redirect(parsed.data.next);
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect("/login");
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
