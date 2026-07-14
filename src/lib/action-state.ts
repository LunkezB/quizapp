import type { ZodError } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: FieldErrors;
};

export const initialActionState: ActionState = {
  ok: false,
  message: "",
};

export function actionSuccess(message: string): ActionState {
  return {
    ok: true,
    message,
  };
}

export function actionError(message: string, fieldErrors?: FieldErrors): ActionState {
  return {
    ok: false,
    message,
    fieldErrors,
  };
}

export function validationError(error: ZodError): ActionState {
  return actionError("Проверьте поля формы.", error.flatten().fieldErrors);
}

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
