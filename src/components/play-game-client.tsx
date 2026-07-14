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
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center" data-testid="play-error">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!room) {
    return <div className="mx-auto max-w-md p-6 text-center text-zinc-600">Подключение...</div>;
  }

  const remainingSec = room.deadline ? Math.max(0, Math.ceil((room.deadline - now) / 1000)) : 0;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="text-sm text-zinc-600">{room.self?.nickname ?? nickname}</span>
        <span className="font-semibold text-emerald-800" data-testid="own-score">
          {room.self?.score ?? 0} очков
        </span>
      </div>

      <p className="text-center text-sm text-zinc-500" data-testid="play-status">
        Статус: {room.status}
      </p>

      {!room.hostConnected && room.status !== "FINISHED" ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-800"
          data-testid="host-disconnected-banner"
        >
          Ведущий временно отключился. Игра на паузе, подождите переподключения...
        </div>
      ) : null}

      {room.status === "LOBBY" ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-zinc-950">Ожидание начала игры...</p>
          <p className="mt-2 text-sm text-zinc-600">Участников в комнате: {room.participants.length}</p>
        </div>
      ) : null}

      {room.status === "QUESTION" && room.currentQuestion ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">
            Вопрос {room.currentQuestionIndex + 1} из {room.totalQuestions}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-950">{room.currentQuestion.text}</h2>
          <p className="mt-2 text-2xl font-bold text-emerald-800" data-testid="play-timer">
            {remainingSec}s
          </p>

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
                  className={`h-14 rounded-md border px-4 text-left text-lg transition disabled:cursor-not-allowed ${
                    isSelected ? "border-emerald-600 bg-emerald-50" : "border-zinc-300 bg-white hover:bg-zinc-50"
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
              className="mt-4 h-11 w-full rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Ответить
            </button>
          ) : null}

          {locked ? (
            <p className="mt-4 text-center text-sm font-medium text-emerald-700" data-testid="answer-locked">
              Ответ принят
            </p>
          ) : null}

          {answerFeedback && !answerFeedback.accepted ? (
            <p className="mt-4 text-center text-sm font-medium text-red-700" data-testid="answer-rejected">
              Ответ не принят: {answerFeedback.reason}
            </p>
          ) : null}
        </div>
      ) : null}

      {room.status === "REVEAL" && room.currentQuestion ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3">
            {room.currentQuestion.options.map((option) => {
              const isCorrect = questionEnd?.correctOptionIds.includes(option.id) ?? false;
              return (
                <div
                  key={option.id}
                  data-testid={isCorrect ? "correct-option" : "incorrect-option"}
                  className={`rounded-md border p-4 text-lg ${
                    isCorrect ? "border-emerald-600 bg-emerald-50" : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  {option.text}
                </div>
              );
            })}
          </div>

          {scoreUpdate ? (
            <p
              className={`mt-4 text-center text-lg font-semibold ${
                scoreUpdate.wasCorrect ? "text-emerald-700" : "text-red-700"
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
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-2 text-sm"
                >
                  <span>
                    #{entry.rank} {entry.nickname}
                  </span>
                  <span className="font-semibold">{entry.score}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {room.status === "FINISHED" ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm" data-testid="final-screen">
          <h2 className="text-xl font-semibold text-zinc-950">Игра завершена</h2>
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
