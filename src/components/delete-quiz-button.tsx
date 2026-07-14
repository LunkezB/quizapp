"use client";

import { useState } from "react";
import { deleteQuizAction } from "@/actions/quizzes";

type DeleteQuizButtonProps = {
  quizId: string;
  className?: string;
  children: React.ReactNode;
};

export function DeleteQuizButton({ quizId, className, children }: DeleteQuizButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    await deleteQuizAction(quizId);
    // Force a hard navigation instead of a soft router transition: the App
    // Router's client cache can otherwise keep serving the pre-delete
    // dashboard snapshot after this redirect.
    window.location.href = "/dashboard";
  };

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={className}>
      {isPending ? "Удаление..." : children}
    </button>
  );
}
