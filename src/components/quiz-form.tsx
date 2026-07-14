"use client";

import { useActionState, useState, type FormEvent } from "react";
import { createQuizAction, updateQuizAction } from "@/actions/quizzes";
import { FieldError } from "@/components/field-error";
import { initialActionState, type ActionState, type FieldErrors } from "@/lib/action-state";
import { quizFormSchema } from "@/lib/validation";

export type CategoryOption = {
  id: string;
  name: string;
};

type QuizFormProps = {
  categories: CategoryOption[];
  quiz?: {
    id: string;
    title: string;
    description: string | null;
    categoryId: string | null;
    defaultTimeLimitSec: number;
  };
};

export function QuizForm({ categories, quiz }: QuizFormProps) {
  const isEditing = Boolean(quiz);
  const action = quiz ? updateQuizAction.bind(null, quiz.id) : createQuizAction;
  const [serverState, formAction, isPending] = useActionState(action, initialActionState);
  const [clientState, setClientState] = useState<ActionState | null>(null);
  const state = clientState ?? serverState;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const parsed = quizFormSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      event.preventDefault();
      setClientState({
        ok: false,
        message: "Проверьте поля формы.",
        fieldErrors: parsed.error.flatten().fieldErrors as FieldErrors,
      });
      return;
    }

    setClientState(null);
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-800">
          Название
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={quiz?.title ?? ""}
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          required
        />
        <FieldError fieldErrors={state.fieldErrors} name="title" />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-800">
          Описание
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={quiz?.description ?? ""}
          rows={4}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
        <FieldError fieldErrors={state.fieldErrors} name="description" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-zinc-800">
            Категория
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={quiz?.categoryId ?? ""}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Без категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldError fieldErrors={state.fieldErrors} name="categoryId" />
        </div>

        <div>
          <label htmlFor="defaultTimeLimitSec" className="block text-sm font-medium text-zinc-800">
            Время по умолчанию, сек.
          </label>
          <input
            id="defaultTimeLimitSec"
            name="defaultTimeLimitSec"
            type="number"
            min={5}
            max={300}
            defaultValue={quiz?.defaultTimeLimitSec ?? 30}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            required
          />
          <FieldError fieldErrors={state.fieldErrors} name="defaultTimeLimitSec" />
        </div>
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
      >
        {isPending ? "Сохранение..." : isEditing ? "Сохранить квиз" : "Создать квиз"}
      </button>
    </form>
  );
}
