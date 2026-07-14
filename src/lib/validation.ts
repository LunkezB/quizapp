import { z } from "zod";

const roleSchema = z.enum(["ORGANIZER", "PARTICIPANT"]);
const questionTypeSchema = z.enum(["SINGLE", "MULTIPLE"]);

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(maxLength).optional());

const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().trim().url().max(2048).optional());

const optionalPositiveInt = (min: number, max: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional());

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(80),
  role: roleSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
  next: z
    .preprocess(emptyToUndefined, z.string().startsWith("/").max(300).optional())
    .transform((value) => (value && !value.startsWith("//") ? value : "/dashboard")),
});

export const quizFormSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: optionalTrimmedString(1000),
  categoryId: optionalUuid,
  defaultTimeLimitSec: z.coerce.number().int().min(5).max(300),
});

const answerOptionInputSchema = z
  .object({
    text: optionalTrimmedString(300),
    imageUrl: optionalUrl,
    isCorrect: z.boolean(),
  })
  .refine((option) => Boolean(option.text || option.imageUrl), {
    message: "Укажите текст или URL изображения.",
    path: ["text"],
  });

const optionsJsonSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.array(answerOptionInputSchema).min(2).max(6));

export const questionFormSchema = z
  .object({
    type: questionTypeSchema,
    text: z.string().trim().min(3).max(1000),
    imageUrl: optionalUrl,
    timeLimitSec: optionalPositiveInt(5, 300),
    points: z.preprocess((value) => {
      if (typeof value === "string" && value.trim() === "") {
        return 1000;
      }

      return value;
    }, z.coerce.number().int().min(0).max(100000)),
    options: optionsJsonSchema,
  })
  .superRefine((question, context) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length;

    if (question.type === "SINGLE" && correctCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Для SINGLE должен быть ровно один правильный вариант.",
        path: ["options"],
      });
    }

    if (question.type === "MULTIPLE" && correctCount < 1) {
      context.addIssue({
        code: "custom",
        message: "Для MULTIPLE нужен минимум один правильный вариант.",
        path: ["options"],
      });
    }
  });

export type QuestionFormInput = z.infer<typeof questionFormSchema>;
