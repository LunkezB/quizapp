"use client";

import { useState } from "react";
import { startSessionAction } from "@/actions/sessions";

type StartSessionButtonProps = {
  quizId: string;
  disabled?: boolean;
  className?: string;
};

export function StartSessionButton({ quizId, disabled, className }: StartSessionButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsPending(true);
    setError(null);

    try {
      const { code } = await startSessionAction(quizId);
      window.location.href = `/host/${code}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось запустить игру.");
      setIsPending(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={disabled || isPending} className={className}>
        {isPending ? "Запуск..." : "Запустить"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
