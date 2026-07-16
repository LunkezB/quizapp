"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { controlClassName, Input, Label } from "@/components/ui/field";

type JoinFormProps = {
  defaultNickname: string;
};

export function JoinForm({ defaultNickname }: JoinFormProps) {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState(defaultNickname);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedCode = code.trim().toUpperCase();
    const trimmedNickname = nickname.trim();

    if (trimmedCode.length !== 6) {
      setError("Код должен содержать 6 символов.");
      return;
    }

    if (!trimmedNickname) {
      setError("Укажите никнейм.");
      return;
    }

    setError(null);
    window.location.href = `/play/${trimmedCode}?nickname=${encodeURIComponent(trimmedNickname)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="code">Код комнаты</Label>
        <input
          id="code"
          name="code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          autoComplete="off"
          className={`mt-2 h-14 text-center font-mono text-2xl uppercase tracking-[0.3em] ${controlClassName}`}
          required
        />
      </div>

      <div>
        <Label htmlFor="nickname">Никнейм</Label>
        <Input
          id="nickname"
          name="nickname"
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={40}
          required
        />
      </div>

      {error ? <p className="text-sm text-pale-red-ink">{error}</p> : null}

      <Button type="submit" size="lg" className="w-full">
        Войти в комнату
      </Button>
    </form>
  );
}
