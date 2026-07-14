"use client";

import { useState, type FormEvent } from "react";

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
        <label htmlFor="code" className="block text-sm font-medium text-zinc-800">
          Код комнаты
        </label>
        <input
          id="code"
          name="code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          autoComplete="off"
          className="mt-2 h-12 w-full rounded-md border border-zinc-300 bg-white px-3 text-center text-2xl font-mono uppercase tracking-[0.3em] text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          required
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-zinc-800">
          Никнейм
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={40}
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-zinc-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
          required
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        className="h-11 w-full rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
      >
        Войти в комнату
      </button>
    </form>
  );
}
