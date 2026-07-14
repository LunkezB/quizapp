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
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!room) {
    return <div className="mx-auto max-w-md p-6 text-center text-zinc-600">Подключение...</div>;
  }

  const remainingSec = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
      <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-600">{quizTitle}</p>
        <p className="text-sm text-zinc-500" data-testid="host-status">
          Статус: {room.status}
        </p>
        {room.status === "LOBBY" ? (
          <>
            <p className="text-sm text-zinc-600">Код комнаты</p>
            <p className="font-mono text-6xl font-bold tracking-[0.3em] text-emerald-800" data-testid="room-code">
              {room.code}
            </p>
          </>
        ) : null}
      </div>

      {room.status === "LOBBY" ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            Участники ({room.participants.length})
          </h2>
          <ul className="mt-4 space-y-2" data-testid="participant-list">
            {room.participants.map((participant) => (
              <li
                key={participant.userId}
                data-testid="participant-item"
                className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-2 text-sm"
              >
                <span>{participant.nickname}</span>
                <span className={participant.connected ? "text-emerald-700" : "text-zinc-400"}>
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
            className="mt-6 h-11 w-full rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            Start
          </button>
        </div>
      ) : null}

      {room.status === "QUESTION" && room.currentQuestion ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">
            Вопрос {room.currentQuestionIndex + 1} из {room.totalQuestions}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-950">{room.currentQuestion.text}</h2>
          <p className="mt-4 text-4xl font-bold text-emerald-800" data-testid="host-timer">
            {remainingSec}s
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {room.currentQuestion.options.map((option) => (
              <div key={option.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-lg">
                {option.text}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-600" data-testid="answered-count">
            Ответили: {answerCount?.answeredCount ?? 0} из {answerCount?.totalParticipants ?? 0}
          </p>
          <button
            type="button"
            onClick={handleNext}
            data-testid="next-question-button"
            className="mt-4 h-11 rounded-md border border-zinc-300 px-5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
          >
            Далее
          </button>
        </div>
      ) : null}

      {room.status === "REVEAL" && room.currentQuestion ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">
            Вопрос {room.currentQuestionIndex + 1} из {room.totalQuestions} — результат
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-950">{room.currentQuestion.text}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="reveal-options">
            {room.currentQuestion.options.map((option) => {
              const isCorrect = questionEnd?.correctOptionIds.includes(option.id) ?? false;
              const count = questionEnd?.breakdown[option.id] ?? 0;
              return (
                <div
                  key={option.id}
                  data-testid={isCorrect ? "correct-option" : "incorrect-option"}
                  className={`rounded-md border p-4 text-lg ${
                    isCorrect ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  {option.text} <span className="text-sm text-zinc-500">({count})</span>
                </div>
              );
            })}
          </div>

          {leaderboard ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-zinc-950">Лидерборд</h3>
              <ol className="mt-3 space-y-2" data-testid="leaderboard">
                {leaderboard.entries.map((entry) => (
                  <li
                    key={entry.userId}
                    data-testid="leaderboard-entry"
                    className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-2 text-sm"
                  >
                    <span>
                      #{entry.rank} {entry.nickname}
                    </span>
                    <span className="font-semibold">{entry.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleNext}
            data-testid="next-question-button"
            className="mt-6 h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            {room.currentQuestionIndex + 1 < room.totalQuestions ? "Следующий вопрос" : "Завершить игру"}
          </button>
        </div>
      ) : null}

      {room.status === "FINISHED" ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm" data-testid="final-screen">
          <h2 className="text-2xl font-semibold text-zinc-950">Игра завершена</h2>
          {finalLeaderboard ? (
            <ol className="mt-4 space-y-2" data-testid="final-leaderboard">
              {finalLeaderboard.entries.map((entry) => (
                <li
                  key={entry.userId}
                  data-testid="final-leaderboard-entry"
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-2 text-sm"
                >
                  <span>
                    #{entry.rank} {entry.nickname}
                    {entry.rank === 1 ? " 🏆" : ""}
                  </span>
                  <span className="font-semibold">{entry.score}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
