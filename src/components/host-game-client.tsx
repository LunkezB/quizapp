"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type AnswerCountUpdatePayload,
  type FinalLeaderboardPayload,
  type LeaderboardPayload,
  type QuestionEndPayload,
  type RoomErrorPayload,
  type RoomStateSnapshot,
} from "@/lib/realtime";

type HostGameClientProps = {
  code: string;
  quizTitle: string;
};

export function HostGameClient({ code, quizTitle }: HostGameClientProps) {
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<RoomStateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answerCount, setAnswerCount] = useState<AnswerCountUpdatePayload | null>(null);
  const [questionEnd, setQuestionEnd] = useState<QuestionEndPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<FinalLeaderboardPayload | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Dedicated namespace: game traffic requires auth (see game-socket.ts),
    // kept separate from the unauthenticated default-namespace ping/pong demo.
    const socket = io("/game", { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(SOCKET_EVENTS.hostJoin, { code });
    });

    socket.on(SOCKET_EVENTS.roomState, (payload: RoomStateSnapshot) => {
      setRoom(payload);
      if (payload.status === "QUESTION") {
        setQuestionEnd(null);
      }
    });

    socket.on(SOCKET_EVENTS.roomError, (payload: RoomErrorPayload) => {
      setError(payload.message);
    });

    // participant_joined/participant_left are informational only here; the
    // room_state broadcast that accompanies them already refreshes the list.
    socket.on(SOCKET_EVENTS.participantJoined, () => {});
    socket.on(SOCKET_EVENTS.participantLeft, () => {});

    socket.on(SOCKET_EVENTS.questionStart, () => {
      setQuestionEnd(null);
      setLeaderboard(null);
      setAnswerCount(null);
    });

    socket.on(SOCKET_EVENTS.answerCountUpdate, (payload: AnswerCountUpdatePayload) => {
      setAnswerCount(payload);
    });

    socket.on(SOCKET_EVENTS.questionEnd, (payload: QuestionEndPayload) => {
      setQuestionEnd(payload);
    });

    socket.on(SOCKET_EVENTS.leaderboard, (payload: LeaderboardPayload) => {
      setLeaderboard(payload);
    });

    socket.on(SOCKET_EVENTS.finalLeaderboard, (payload: FinalLeaderboardPayload) => {
      setFinalLeaderboard(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code]);

  useEffect(() => {
    if (room?.status !== "QUESTION") {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [room?.status]);

  const handleStart = () => socketRef.current?.emit(SOCKET_EVENTS.startGame, { code });
  const handleNext = () => socketRef.current?.emit(SOCKET_EVENTS.nextQuestion, { code });

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-[12px] border border-pale-red-ink/20 bg-pale-red p-6 text-center">
        <p className="text-pale-red-ink">{error}</p>
      </div>
    );
  }

  if (!room) {
    return <div className="mx-auto mt-10 max-w-md p-6 text-center text-muted">Подключение...</div>;
  }

  const remainingSec = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : 0;

  return (
    <div className="fade-up mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <div className="flex flex-col items-center gap-2 rounded-[12px] border border-line bg-surface p-8 text-center shadow-soft">
        <p className="text-sm font-medium text-muted">{quizTitle}</p>
        <p className="text-xs uppercase tracking-[0.08em] text-faint" data-testid="host-status">
          Статус: {room.status}
        </p>
        {room.status === "LOBBY" ? (
          <>
            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-muted">Код комнаты</p>
            <p className="font-mono text-7xl font-bold tracking-[0.2em] text-ink sm:text-8xl" data-testid="room-code">
              {room.code}
            </p>
          </>
        ) : null}
      </div>

      {room.status === "LOBBY" ? (
        <div className="rounded-[12px] border border-line bg-surface p-8 shadow-soft">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Участники ({room.participants.length})</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="participant-list">
            {room.participants.map((participant) => (
              <li
                key={participant.userId}
                data-testid="participant-item"
                className="flex items-center justify-between rounded-[8px] bg-surface-muted px-4 py-3 text-base"
              >
                <span className="font-medium text-ink">{participant.nickname}</span>
                <span className={participant.connected ? "text-sm text-pale-green-ink" : "text-sm text-faint"}>
                  {participant.connected ? "в сети" : "офлайн"}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleStart}
            disabled={room.participants.length === 0}
            data-testid="start-game-button"
            className="mt-8 h-12 w-full rounded-[6px] bg-ink px-5 text-base font-medium text-white transition active:scale-[0.99] hover:bg-ink-soft disabled:pointer-events-none disabled:opacity-45"
          >
            Start
          </button>
        </div>
      ) : null}

      {room.status === "QUESTION" && room.currentQuestion ? (
        <div className="rounded-[12px] border border-line bg-surface p-8 shadow-soft">
          <div className="flex items-start justify-between gap-6">
            <p className="text-sm text-muted">
              Вопрос {room.currentQuestionIndex + 1} из {room.totalQuestions}
            </p>
            <span
              className="font-mono text-6xl font-bold leading-none tabular-nums text-ink"
              data-testid="host-timer"
            >
              {remainingSec}s
            </span>
          </div>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">{room.currentQuestion.text}</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {room.currentQuestion.options.map((option) => (
              <div
                key={option.id}
                className="rounded-[10px] border border-line bg-surface-muted p-5 text-xl text-ink-soft"
              >
                {option.text}
              </div>
            ))}
          </div>
          <p className="mt-8 text-lg text-muted" data-testid="answered-count">
            Ответили:{" "}
            <span className="font-semibold tabular-nums text-ink">{answerCount?.answeredCount ?? 0}</span> из{" "}
            {answerCount?.totalParticipants ?? 0}
          </p>
          <button
            type="button"
            onClick={handleNext}
            data-testid="next-question-button"
            className="mt-4 h-11 rounded-[6px] border border-line bg-surface px-5 text-sm font-medium text-ink-soft transition hover:bg-surface-muted active:scale-[0.98]"
          >
            Далее
          </button>
        </div>
      ) : null}

      {room.status === "REVEAL" && room.currentQuestion ? (
        <div className="rounded-[12px] border border-line bg-surface p-8 shadow-soft">
          <p className="text-sm text-muted">
            Вопрос {room.currentQuestionIndex + 1} из {room.totalQuestions} — результат
          </p>
          <h2 className="mt-2 font-display text-3xl text-ink sm:text-4xl">{room.currentQuestion.text}</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2" data-testid="reveal-options">
            {room.currentQuestion.options.map((option) => {
              const isCorrect = questionEnd?.correctOptionIds.includes(option.id) ?? false;
              const count = questionEnd?.breakdown[option.id] ?? 0;
              return (
                <div
                  key={option.id}
                  data-testid={isCorrect ? "correct-option" : "incorrect-option"}
                  className={`flex items-center justify-between rounded-[10px] border p-5 text-xl ${
                    isCorrect
                      ? "border-pale-green-ink/30 bg-pale-green text-pale-green-ink"
                      : "border-line bg-surface-muted text-muted"
                  }`}
                >
                  <span>{option.text}</span>
                  <span className="font-mono text-base tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>

          {leaderboard ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold tracking-tight text-ink">Лидерборд</h3>
              <ol className="mt-3 space-y-2" data-testid="leaderboard">
                {leaderboard.entries.map((entry) => (
                  <li
                    key={entry.userId}
                    data-testid="leaderboard-entry"
                    className="flex items-center justify-between rounded-[8px] bg-surface-muted px-4 py-2.5 text-base"
                  >
                    <span className="text-ink">
                      <span className="font-mono text-faint">#{entry.rank}</span> {entry.nickname}
                    </span>
                    <span className="font-semibold tabular-nums text-ink">{entry.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleNext}
            data-testid="next-question-button"
            className="mt-8 h-11 rounded-[6px] bg-ink px-5 text-sm font-medium text-white transition hover:bg-ink-soft active:scale-[0.98]"
          >
            {room.currentQuestionIndex + 1 < room.totalQuestions ? "Следующий вопрос" : "Завершить игру"}
          </button>
        </div>
      ) : null}

      {room.status === "FINISHED" ? (
        <div className="rounded-[12px] border border-line bg-surface p-8 text-center shadow-soft" data-testid="final-screen">
          <h2 className="font-display text-4xl text-ink">Игра завершена</h2>
          {finalLeaderboard ? (
            <ol className="mx-auto mt-6 max-w-xl space-y-2 text-left" data-testid="final-leaderboard">
              {finalLeaderboard.entries.map((entry) => (
                <li
                  key={entry.userId}
                  data-testid="final-leaderboard-entry"
                  className={`flex items-center justify-between rounded-[8px] px-5 py-3 text-lg ${
                    entry.rank === 1 ? "bg-pale-yellow text-pale-yellow-ink" : "bg-surface-muted text-ink"
                  }`}
                >
                  <span>
                    <span className="font-mono">#{entry.rank}</span> {entry.nickname}
                  </span>
                  <span className="font-semibold tabular-nums">{entry.score}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
