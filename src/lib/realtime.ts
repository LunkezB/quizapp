import { z } from "zod";

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export type RoomStatus = "LOBBY" | "QUESTION" | "REVEAL" | "FINISHED";

export type PublicAnswerOption = {
  id: string;
  text: string | null;
  imageUrl: string | null;
};

export type PublicQuestion = {
  id: string;
  order: number;
  type: "SINGLE" | "MULTIPLE";
  text: string;
  imageUrl: string | null;
  timeLimitSec: number;
  points: number;
  options: PublicAnswerOption[];
};

export type PublicParticipant = {
  userId: string;
  nickname: string;
  score: number;
  connected: boolean;
  hasAnswered: boolean;
};

export type LeaderboardEntry = {
  userId: string;
  nickname: string;
  score: number;
  rank: number;
};

export type RoomStateSnapshot = {
  code: string;
  status: RoomStatus;
  hostConnected: boolean;
  participants: PublicParticipant[];
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: PublicQuestion | null;
  deadline: number | null;
  self:
    | {
        userId: string;
        nickname: string;
        score: number;
        hasAnswered: boolean;
      }
    | null;
};

// Client -> Server payloads

export const hostJoinPayloadSchema = z.object({
  code: z.string().length(ROOM_CODE_LENGTH),
});
export type HostJoinPayload = z.infer<typeof hostJoinPayloadSchema>;

export const joinRoomPayloadSchema = z.object({
  code: z.string().length(ROOM_CODE_LENGTH),
  nickname: z.string().trim().min(1).max(40).optional(),
});
export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;

export const startGamePayloadSchema = z.object({
  code: z.string().length(ROOM_CODE_LENGTH),
});
export type StartGamePayload = z.infer<typeof startGamePayloadSchema>;

export const nextQuestionPayloadSchema = z.object({
  code: z.string().length(ROOM_CODE_LENGTH),
});
export type NextQuestionPayload = z.infer<typeof nextQuestionPayloadSchema>;

export const submitAnswerPayloadSchema = z.object({
  code: z.string().length(ROOM_CODE_LENGTH),
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string().uuid()).min(0).max(6),
});
export type SubmitAnswerPayload = z.infer<typeof submitAnswerPayloadSchema>;

// Server -> Client payloads

export type RoomErrorPayload = {
  message: string;
};

export type ParticipantJoinedPayload = {
  participant: PublicParticipant;
  reconnected: boolean;
};

export type ParticipantLeftPayload = {
  userId: string;
};

export type QuestionStartPayload = {
  questionIndex: number;
  totalQuestions: number;
  question: PublicQuestion;
  deadline: number;
};

export type AnswerReceivedPayload = {
  accepted: boolean;
  reason?: string;
};

export type AnswerCountUpdatePayload = {
  answeredCount: number;
  totalParticipants: number;
};

export type QuestionEndPayload = {
  questionIndex: number;
  correctOptionIds: string[];
  breakdown: Record<string, number>;
};

export type ScoreUpdatePayload = {
  questionIndex: number;
  wasCorrect: boolean;
  pointsAwarded: number;
  totalScore: number;
};

export type LeaderboardPayload = {
  entries: LeaderboardEntry[];
};

export type GameOverPayload = Record<string, never>;

export type FinalLeaderboardPayload = {
  entries: LeaderboardEntry[];
};

export const SOCKET_EVENTS = {
  // client -> server
  hostJoin: "host_join",
  joinRoom: "join_room",
  startGame: "start_game",
  nextQuestion: "next_question",
  submitAnswer: "submit_answer",
  // server -> client
  roomState: "room_state",
  roomError: "room_error",
  participantJoined: "participant_joined",
  participantLeft: "participant_left",
  questionStart: "question_start",
  answerReceived: "answer_received",
  answerCountUpdate: "answer_count_update",
  questionEnd: "question_end",
  scoreUpdate: "score_update",
  leaderboard: "leaderboard",
  gameOver: "game_over",
  finalLeaderboard: "final_leaderboard",
} as const;
