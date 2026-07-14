"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { FieldError } from "@/components/field-error";
import { initialActionState, type ActionState, type FieldErrors } from "@/lib/action-state";
import { loginSchema, registerSchema } from "@/lib/validation";

type AuthFormProps =
  | {
      mode: "login";
      nextPath: string;
    }
  | {
      mode: "register";
    };

export function AuthForm(props: AuthFormProps) {
  const isLogin = props.mode === "login";
  const action = isLogin ? loginAction : registerAction;
  const [serverState, formAction, isPending] = useActionState(action, initialActionState);
  const [clientState, setClientState] = useState<ActionState | null>(null);
  const state = clientState ?? serverState;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const parsed = (isLogin ? loginSchema : registerSchema).safeParse(Object.fromEntries(formData));

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
      {isLogin ? <input type="hidden" name="next" value={props.nextPath} /> : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          required
        />
        <FieldError fieldErrors={state.fieldErrors} name="email" />
      </div>

      {!isLogin ? (
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-zinc-800">
            Имя
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            required
          />
          <FieldError fieldErrors={state.fieldErrors} name="displayName" />
        </div>
      ) : null}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          required
        />
        <FieldError fieldErrors={state.fieldErrors} name="password" />
      </div>

      {!isLogin ? (
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-zinc-800">
            Стартовая роль
          </label>
          <select
            id="role"
            name="role"
            defaultValue="ORGANIZER"
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="ORGANIZER">Организатор</option>
            <option value="PARTICIPANT">Участник</option>
          </select>
          <FieldError fieldErrors={state.fieldErrors} name="role" />
        </div>
      ) : null}

      {state.message ? (
        <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
      >
        {isPending ? "Отправка..." : isLogin ? "Войти" : "Зарегистрироваться"}
      </button>

      <p className="text-center text-sm text-zinc-600">
        {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
        <Link href={isLogin ? "/register" : "/login"} className="font-medium text-emerald-800">
          {isLogin ? "Регистрация" : "Войти"}
        </Link>
      </p>
    </form>
  );
}
