"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, type FormEvent } from "react";
import { createQuestionAction, updateQuestionAction } from "@/actions/questions";
import { FieldError } from "@/components/field-error";
import { initialActionState, type ActionState, type FieldErrors } from "@/lib/action-state";
import { questionFormSchema } from "@/lib/validation";

type QuestionOptionDraft = {
  clientId: string;
  text: string;
  imageUrl: string;
  isCorrect: boolean;
};

type QuestionFormProps = {
  quizId: string;
  question?: {
    id: string;
    type: "SINGLE" | "MULTIPLE";
    text: string;
    imageUrl: string | null;
    timeLimitSec: number | null;
    points: number;
    answerOptions: Array<{
      id: string;
      text: string | null;
      imageUrl: string | null;
      isCorrect: boolean;
    }>;
  };
};

export function QuestionForm({ quizId, question }: QuestionFormProps) {
  const [type, setType] = useState<"SINGLE" | "MULTIPLE">(question?.type ?? "SINGLE");
  const [options, setOptions] = useState<QuestionOptionDraft[]>(() => {
    if (question?.answerOptions.length) {
      return question.answerOptions.map((option) => ({
        clientId: option.id,
        text: option.text ?? "",
        imageUrl: option.imageUrl ?? "",
        isCorrect: option.isCorrect,
      }));
    }

    return [
      { clientId: "option-1", text: "", imageUrl: "", isCorrect: true },
      { clientId: "option-2", text: "", imageUrl: "", isCorrect: false },
    ];
  });
  const action = question
    ? updateQuestionAction.bind(null, quizId, question.id)
    : createQuestionAction.bind(null, quizId);
  const [serverState, formAction, isPending] = useActionState(action, initialActionState);
  const [clientState, setClientState] = useState<ActionState | null>(null);
  const state = clientState ?? serverState;

  const serializedOptions = useMemo(
    () =>
      JSON.stringify(
        options.map((option) => ({
          text: option.text,
          imageUrl: option.imageUrl,
          isCorrect: option.isCorrect,
        })),
      ),
    [options],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const parsed = questionFormSchema.safeParse(Object.fromEntries(formData));

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

  const setSingleCorrect = (clientId: string) => {
    setOptions((current) =>
      current.map((option) => ({
        ...option,
        isCorrect: option.clientId === clientId,
      })),
    );
  };

  const toggleMultipleCorrect = (clientId: string) => {
    setOptions((current) =>
      current.map((option) =>
        option.clientId === clientId ? { ...option, isCorrect: !option.isCorrect } : option,
      ),
    );
  };

  const updateOption = (clientId: string, field: "text" | "imageUrl", value: string) => {
    setOptions((current) =>
      current.map((option) => (option.clientId === clientId ? { ...option, [field]: value } : option)),
    );
  };

  const removeOption = (clientId: string) => {
    setOptions((current) => {
      if (current.length <= 2) {
        return current;
      }

      const next = current.filter((option) => option.clientId !== clientId);
      if (type === "SINGLE" && !next.some((option) => option.isCorrect)) {
        const [firstOption, ...restOptions] = next;

        if (firstOption) {
          return [{ ...firstOption, isCorrect: true }, ...restOptions];
        }
      }

      return next;
    });
  };

  const addOption = () => {
    setOptions((current) => {
      if (current.length >= 6) {
        return current;
      }

      return [
        ...current,
        {
          clientId: crypto.randomUUID(),
          text: "",
          imageUrl: "",
          isCorrect: false,
        },
      ];
    });
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="options" value={serializedOptions} />

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-zinc-800">
            Тип
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) => {
              const nextType = event.target.value as "SINGLE" | "MULTIPLE";
              setType(nextType);
              if (nextType === "SINGLE") {
                setSingleCorrect(options.find((option) => option.isCorrect)?.clientId ?? options[0]?.clientId ?? "");
              }
            }}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="SINGLE">SINGLE</option>
            <option value="MULTIPLE">MULTIPLE</option>
          </select>
          <FieldError fieldErrors={state.fieldErrors} name="type" />
        </div>

        <div>
          <label htmlFor="timeLimitSec" className="block text-sm font-medium text-zinc-800">
            Лимит, сек.
          </label>
          <input
            id="timeLimitSec"
            name="timeLimitSec"
            type="number"
            min={5}
            max={300}
            defaultValue={question?.timeLimitSec ?? ""}
            placeholder="Дефолт квиза"
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
          <FieldError fieldErrors={state.fieldErrors} name="timeLimitSec" />
        </div>

        <div>
          <label htmlFor="points" className="block text-sm font-medium text-zinc-800">
            Очки
          </label>
          <input
            id="points"
            name="points"
            type="number"
            min={0}
            max={100000}
            defaultValue={question?.points ?? 1000}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          />
          <FieldError fieldErrors={state.fieldErrors} name="points" />
        </div>
      </div>

      <div>
        <label htmlFor="text" className="block text-sm font-medium text-zinc-800">
          Текст вопроса
        </label>
        <textarea
          id="text"
          name="text"
          rows={4}
          defaultValue={question?.text ?? ""}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          required
        />
        <FieldError fieldErrors={state.fieldErrors} name="text" />
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-zinc-800">
          Image URL
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          defaultValue={question?.imageUrl ?? ""}
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        />
        <FieldError fieldErrors={state.fieldErrors} name="imageUrl" />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Варианты ответа</h2>
            <p className="mt-1 text-sm text-zinc-600">От 2 до 6 вариантов, текст или изображение обязательны.</p>
          </div>
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= 6}
            className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Добавить
          </button>
        </div>
        <FieldError fieldErrors={state.fieldErrors} name="options" />

        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={option.clientId} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <label className="flex h-10 items-center gap-2 text-sm font-medium text-zinc-800">
                  <input
                    type={type === "SINGLE" ? "radio" : "checkbox"}
                    name="correctOption"
                    checked={option.isCorrect}
                    onChange={() =>
                      type === "SINGLE"
                        ? setSingleCorrect(option.clientId)
                        : toggleMultipleCorrect(option.clientId)
                    }
                    className="h-4 w-4 accent-emerald-700"
                  />
                  Верный
                </label>

                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(event) => updateOption(option.clientId, "text", event.target.value)}
                    placeholder={`Вариант ${index + 1}`}
                    className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  />
                  <input
                    type="url"
                    value={option.imageUrl}
                    onChange={(event) => updateOption(option.clientId, "imageUrl", event.target.value)}
                    placeholder="Image URL"
                    className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeOption(option.clientId)}
                  disabled={options.length <= 2}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-white disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {state.message ? (
        <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
        >
          {isPending ? "Сохранение..." : question ? "Сохранить вопрос" : "Добавить вопрос"}
        </button>
        <Link
          href={`/quiz/${quizId}/edit`}
          className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}
