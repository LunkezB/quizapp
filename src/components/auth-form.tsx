"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { FieldError } from "@/components/field-error";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
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
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError fieldErrors={state.fieldErrors} name="email" />
      </div>

      {!isLogin ? (
        <div>
          <Label htmlFor="displayName">Имя</Label>
          <Input id="displayName" name="displayName" type="text" autoComplete="name" required />
          <FieldError fieldErrors={state.fieldErrors} name="displayName" />
        </div>
      ) : null}

      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
        <FieldError fieldErrors={state.fieldErrors} name="password" />
      </div>

      {!isLogin ? (
        <div>
          <Label htmlFor="role">Стартовая роль</Label>
          <Select id="role" name="role" defaultValue="ORGANIZER">
            <option value="ORGANIZER">Организатор</option>
            <option value="PARTICIPANT">Участник</option>
          </Select>
          <FieldError fieldErrors={state.fieldErrors} name="role" />
        </div>
      ) : null}

      {state.message ? (
        <p className={state.ok ? "text-sm text-pale-green-ink" : "text-sm text-pale-red-ink"}>{state.message}</p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? "Отправка..." : isLogin ? "Войти" : "Зарегистрироваться"}
      </Button>

      <p className="text-center text-sm text-muted">
        {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
        <Link href={isLogin ? "/register" : "/login"} className="font-medium text-ink underline underline-offset-4">
          {isLogin ? "Регистрация" : "Войти"}
        </Link>
      </p>
    </form>
  );
}
