"use client";

import { useActionState, useState, type FormEvent } from "react";
import { createQuizAction, updateQuizAction } from "@/actions/quizzes";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
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
        <Label htmlFor="title">Название</Label>
        <Input id="title" name="title" type="text" defaultValue={quiz?.title ?? ""} required />
        <FieldError fieldErrors={state.fieldErrors} name="title" />
      </div>

      <div>
        <Label htmlFor="description">Описание</Label>
        <Textarea id="description" name="description" defaultValue={quiz?.description ?? ""} rows={4} />
        <FieldError fieldErrors={state.fieldErrors} name="description" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="categoryId">Категория</Label>
          <Select id="categoryId" name="categoryId" defaultValue={quiz?.categoryId ?? ""}>
            <option value="">Без категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <FieldError fieldErrors={state.fieldErrors} name="categoryId" />
        </div>

        <div>
          <Label htmlFor="defaultTimeLimitSec">Время по умолчанию, сек.</Label>
          <Input
            id="defaultTimeLimitSec"
            name="defaultTimeLimitSec"
            type="number"
            min={5}
            max={300}
            defaultValue={quiz?.defaultTimeLimitSec ?? 30}
            required
          />
          <FieldError fieldErrors={state.fieldErrors} name="defaultTimeLimitSec" />
        </div>
      </div>

      {state.message ? (
        <p className={state.ok ? "text-sm text-pale-green-ink" : "text-sm text-pale-red-ink"}>{state.message}</p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Сохранение..." : isEditing ? "Сохранить квиз" : "Создать квиз"}
      </Button>
    </form>
  );
}
