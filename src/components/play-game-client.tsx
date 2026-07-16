"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type AnswerReceivedPayload,
  type FinalLeaderboardPayload,
  type LeaderboardPayload,
  type QuestionEndPayload,
  type RoomErrorPayload,
  type RoomStateSnapshot,
  type ScoreUpdatePayload,
} from "@/lib/realtime";

type PlayGameClientProps = {
  code: string;
  nickname: string | null;
};

export function PlayGameClient({ code, nickname }: PlayGameClientProps) {
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<RoomStateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerReceivedPayload | null>(null);
  const [questionEnd, setQuestionEnd] = useState<QuestionEndPayload | null>(null);
  const [scoreUpdate, setScoreUpdate] = useState<ScoreUpdatePayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<FinalLeaderboardPayload | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Dedicated namespace: game traffic requires auth (see game-socket.ts),
    // kept separate from the unauthenticated default-namespace ping/pong demo.
    const socket = io("/game", { path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(SOCKET_EVENTS.joinRoom, { code, nickname: nickname ?? undefined });
    });

    socket.on(SOCKET_EVENTS.roomState, (payload: RoomStateSnapshot) => {
      setRoom(payload);
      setLocked(payload.self?.hasAnswered ?? false);
    });

    socket.on(SOCKET_EVENTS.roomError, (payload: RoomErrorPayload) => {
      setError(payload.message);
    });

    socket.on(SOCKET_EVENTS.questionStart, () => {
      setSelected([]);
      setLocked(false);
      setAnswerFeedback(null);
      setQuestionEnd(null);
      setScoreUpdate(null);
      setLeaderboard(null);
    });

    socket.on(SOCKET_EVENTS.answerReceived, (payload: AnswerReceivedPayload) => {
      setAnswerFeedback(payload);
      if (payload.accepted) {
        setLocked(true);
      }
    });

    socket.on(SOCKET_EVENTS.questionEnd, (payload: QuestionEndPayload) => {
      setQuestionEnd(payload);
      setLocked(true);
    });

    socket.on(SOCKET_EVENTS.scoreUpdate, (payload: ScoreUpdatePayload) => {
      setScoreUpdate(payload);
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
  }, [code, nickname]);

  useEffect(() => {
    if (room?.status !== "QUESTION") {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [room?.status]);

  const submitAnswer = (optionIds: string[]) => {
    if (!room?.currentQuestion || locked) {
      return;
    }

    setLocked(true);
    socketRef.current?.emit(SOCKET_EVENTS.submitAnswer, {
      code,
      questionId: room.currentQuestion.id,
      selectedOptionIds: optionIds,
    });
  };

  const handleOptionClick = (optionId: string) => {
    if (!room?.currentQuestion || locked) {
      return;
    }

    if (room.currentQuestion.type === "SINGLE") {
      setSelected([optionId]);
      submitAnswer([optionId]);
      return;
    }

    setSelected((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
    );
  };

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-[12px] border border-pale-red-ink/20 bg-pale-red p-6 text-center" data-testid="play-error">
        <p className="text-pale-red-ink">{error}</p>
      </div>
    );
  }

  if (!room) {
    return <div className="mx-auto mt-10 max-w-md p-6 text-center text-muted">Подключение...</div>;
  }

  const remainingSec = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : 0;

  return (
    <div className="fade-up mx-auto w-full max-w-2xl space-y-5 px-5 py-8">
      <div className="flex items-center justify-between rounded-[12px] border border-line bg-surface px-5 py-4 shadow-soft">
        <span className="text-sm font-medium text-ink">{room.self?.nickname ?? nickname}</span>
        <span className="text-base font-semibold tabular-nums text-ink" data-testid="own-score">
          {room.self?.score ?? 0} очков
        </span>
      </div>

      <p className="text-center text-xs uppercase tracking-[0.08em] text-faint" data-testid="play-status">
        Статус: {room.status}
      </p>

      {!room.hostConnected && room.status !== "FINISHED" ? (
        <div
          className="rounded-[12px] border border-pale-yellow-ink/25 bg-pale-yellow p-4 text-center text-sm text-pale-yellow-ink"
          data-testid="host-disconnected-banner"
        >
          Ведущий временно отключился. Игра на паузе, подождите переподключения...
        </div>
      ) : null}

      {room.status === "LOBBY" ? (
        <div className="rounded-[12px] border border-line bg-surface p-8 text-center shadow-soft">
          <p className="font-display text-2xl text-ink">Ожидание начала игры…</p>
          <p className="mt-3 text-sm text-muted">Участников в комнате: {room.participants.length}</p>
        </div>
      ) : null}

      {room.status === "QUESTION" && room.currentQuestion ? (
        <div className="rounded-[12px] border border-line bg-surface p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              Вопрос {room.currentQuestionIndex + 1} из {room.totalQuestions}
            </p>
            <span
              className="font-mono text-3xl font-semibold tabular-nums text-ink"
              data-testid="play-timer"
            >
              {remainingSec}s
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">{room.currentQuestion.text}</h2>

          <div className="mt-6 grid gap-3">
            {room.currentQuestion.options.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  data-testid="answer-option"
                  data-option-id={option.id}
                  disabled={locked}
                  onClick={() => handleOptionClick(option.id)}
                  className={`flex min-h-[64px] items-center rounded-[10px] border px-5 text-left text-lg font-medium transition-[transform,background-color,border-color] duration-100 active:scale-[0.99] disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-ink bg-ink/[0.04] text-ink"
                      : "border-line bg-surface text-ink-soft hover:border-line-strong"
                  }`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          {room.currentQuestion.type === "MULTIPLE" ? (
            <button
              type="button"
              data-testid="submit-answer-button"
              disabled={locked || selected.length === 0}
              onClick={() => submitAnswer(selected)}
              className="mt-4 h-12 w-full rounded-[6px] bg-ink px-5 text-sm font-medium text-white transition active:scale-[0.99] hover:bg-ink-soft disabled:pointer-events-none disabled:opacity-45"
            >
              Ответить
            </button>
          ) : null}

          {locked ? (
            <p className="mt-4 text-center text-sm font-medium text-pale-green-ink" data-testid="answer-locked">
              Ответ принят
            </p>
          ) : null}

          {answerFeedback && !answerFeedback.accepted ? (
            <p className="mt-4 text-center text-sm font-medium text-pale-red-ink" data-testid="answer-rejected">
              Ответ не принят: {answerFeedback.reason}
            </p>
          ) : null}
        </div>
      ) : null}

      {room.status === "REVEAL" && room.currentQuestion ? (
        <div className="rounded-[12px] border border-line bg-surface p-6 shadow-soft">
          <div className="grid gap-3">
            {room.currentQuestion.options.map((option) => {
              const isCorrect = questionEnd?.correctOptionIds.includes(option.id) ?? false;
              return (
                <div
                  key={option.id}
                  data-testid={isCorrect ? "correct-option" : "incorrect-option"}
                  className={`rounded-[10px] border p-4 text-lg ${
                    isCorrect
                      ? "border-pale-green-ink/30 bg-pale-green text-pale-green-ink"
                      : "border-line bg-surface-muted text-muted"
                  }`}
                >
                  {option.text}
                </div>
              );
            })}
          </div>

          {scoreUpdate ? (
            <p
              className={`mt-5 text-center text-xl font-semibold ${
                scoreUpdate.wasCorrect ? "text-pale-green-ink" : "text-pale-red-ink"
              }`}
              data-testid="own-result"
            >
              {scoreUpdate.wasCorrect ? `Верно! +${scoreUpdate.pointsAwarded}` : "Неверно"}
            </p>
          ) : null}

          {leaderboard ? (
            <ol className="mt-6 space-y-2" data-testid="leaderboard">
              {leaderboard.entries.map((entry) => (
                <li
                  key={entry.userId}
                  data-testid="leaderboard-entry"
                  className="flex items-center justify-between rounded-[8px] bg-surface-muted px-4 py-2.5 text-sm"
                >
                  <span className="text-ink">
                    <span className="font-mono text-faint">#{entry.rank}</span> {entry.nickname}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{entry.score}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {room.status === "FINISHED" ? (
        <div className="rounded-[12px] border border-line bg-surface p-6 text-center shadow-soft" data-testid="final-screen">
          <h2 className="font-display text-2xl text-ink">Игра завершена</h2>
          {finalLeaderboard ? (
            <ol className="mt-5 space-y-2 text-left" data-testid="final-leaderboard">
              {finalLeaderboard.entries.map((entry) => (
                <li
                  key={entry.userId}
                  data-testid="final-leaderboard-entry"
                  className={`flex items-center justify-between rounded-[8px] px-4 py-2.5 text-sm ${
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
