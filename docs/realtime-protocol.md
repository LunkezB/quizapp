# Realtime protocol: игровая сессия

Транспорт: Socket.IO, путь `/socket.io`, namespace `/game`. Игровой namespace
отделён от дефолтного (`/`, там живёт только служебный ping/pong health-check
из `src/components/socket-status.tsx`), потому что `io.use(...)` — это
middleware уровня namespace: авторизация нужна только игровому трафику, а
health-check должен оставаться доступным без логина. Все сокеты `/game`
авторизуются JWT-cookie (`quizapp_session`) при handshake
(`io.use(...)` в `src/server/game-socket.ts`) — неавторизованное подключение
отклоняется на уровне соединения. Участие в игре требует того же логина,
что и остальной MVP; никнейм на `/join` — это отображаемое имя для конкретной
игры, а не аккаунт.

Источник истины во время игры — in-memory реестр комнат
(`src/server/game-store.ts`, `Map<code, RoomState>`, живёт на `globalThis`,
чтобы быть общим и для Server Actions, и для обработчиков сокетов). Таблица
`Session`/`SessionParticipant`/`ParticipantAnswer` в Postgres используется
для старта, персиста ответов по ходу игры и финального состояния, на
которых строится история игр (см. ниже).

Статусы комнаты: `LOBBY → QUESTION → REVEAL → (QUESTION|FINISHED)`.

## Client → Server

| Событие | Payload (zod) | Кто шлёт | Поведение |
|---|---|---|---|
| `host_join` | `{ code: string(6) }` | хост | Прикрепляет сокет хоста к комнате, если `room.hostUserId` совпадает с текущим пользователем. Иначе `room_error`. |
| `join_room` | `{ code: string(6), nickname?: string }` | участник | Новый вход (только в `LOBBY`, никнейм обязателен) либо реконнект уже известного `userId` (никнейм игнорируется, счёт сохраняется). После статуса `LOBBY` новые участники получают `room_error`. |
| `start_game` | `{ code }` | хост | Только из `LOBBY`, только если есть хотя бы один участник. Открывает вопрос №0. |
| `next_question` | `{ code }` | хост | Из `QUESTION` — досрочно закрывает текущий вопрос (→`REVEAL`). Из `REVEAL` — открывает следующий вопрос либо, если вопросов больше нет, завершает игру (→`FINISHED`). |
| `submit_answer` | `{ code, questionId: uuid, selectedOptionIds: uuid[] }` | участник | Принимается только если статус `QUESTION`, `questionId` совпадает с текущим вопросом, дедлайн не прошёл и участник ещё не отвечал на этот вопрос (идемпотентно — повтор игнорируется). |

Все payload'ы валидируются zod-схемами в `src/lib/realtime.ts`; некорректные
структуры не роняют сервер, а просто игнорируются/отклоняются.

## Server → Client

| Событие | Payload | Кому | Комментарий |
|---|---|---|---|
| `room_state` | `RoomStateSnapshot` (см. ниже) | адресно (хосту и/или каждому участнику лично) | Полный снимок комнаты, персонализированный полем `self` для участника. Шлётся при `host_join`/`join_room`/на любое изменение состава или статуса. |
| `room_error` | `{ message: string }` | адресно | Комната не найдена, попытка входа не в свою роль, игра уже началась и т.п. |
| `participant_joined` | `{ participant: PublicParticipant, reconnected: boolean }` | всей комнате | Новый участник или реконнект. |
| `participant_left` | `{ userId: string }` | всей комнате | Дисконнект участника (не удаляется из игры, помечается `connected:false`). |
| `question_start` | `{ questionIndex, totalQuestions, question: PublicQuestion, deadline: number }` | всей комнате | **`PublicQuestion`/`PublicAnswerOption` структурно не содержат `isCorrect` — это гарантия на уровне типов, а не просто фильтр перед отправкой.** `deadline` — абсолютный `Date.now() + timeLimitSec*1000` на сервере. |
| `answer_received` | `{ accepted: boolean, reason?: string }` | адресно приславшему | Ack без раскрытия правильности. |
| `answer_count_update` | `{ answeredCount, totalParticipants }` | хосту | Только подключённые участники считаются в знаменателе. |
| `question_end` | `{ questionIndex, correctOptionIds: string[], breakdown: Record<optionId, count> }` | всей комнате | Раскрытие правильных вариантов после закрытия вопроса (по дедлайну или когда все ответили). |
| `score_update` | `{ questionIndex, wasCorrect, pointsAwarded, totalScore }` | адресно каждому участнику лично | Личный результат — не транслируется остальным. |
| `leaderboard` | `{ entries: LeaderboardEntry[] }` | всей комнате | Топ-10 по очкам после каждого вопроса. |
| `game_over` | `{}` | всей комнате | Статус стал `FINISHED`. |
| `final_leaderboard` | `{ entries: LeaderboardEntry[] }` | всей комнате | Все участники (не топ-10), финальные места. |

### `RoomStateSnapshot`

```ts
{
  code: string;
  status: "LOBBY" | "QUESTION" | "REVEAL" | "FINISHED";
  hostConnected: boolean;
  participants: PublicParticipant[]; // { userId, nickname, score, connected, hasAnswered }
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: PublicQuestion | null; // только для QUESTION/REVEAL, без isCorrect
  deadline: number | null;
  self: { userId, nickname, score, hasAnswered } | null; // только у участника
}
```

## Формула баллов (только на сервере, `src/server/game-store.ts`)

```
remainingMs = clamp(deadline - answeredAt, 0, totalMs)
factor = remainingMs / totalMs
pointsAwarded = isCorrect ? floor(points * (0.5 + 0.5 * factor)) : 0
```

- `SINGLE`: верно, если выбран ровно один вариант и он совпадает с правильным.
- `MULTIPLE`: верно, если множество выбранных id **точно** совпадает с
  множеством правильных id (частичных баллов нет).
- Клиент никогда не участвует в подсчёте: таймер на экране — чисто
  визуальный обратный отсчёт от серверного `deadline`, а не источник истины.

## Надёжность

- **Дисконнект хоста**: `hostSocketId` очищается, всем участникам уходит
  обновлённый `room_state` с `hostConnected:false`; экран участника
  показывает баннер паузы. Таймеры вопросов продолжают тикать на сервере
  независимо от подключения хоста. При повторном `host_join` (тот же
  `hostUserId`) баннер снимается.
- **Дисконнект участника**: помечается `connected:false`, остаётся в
  лидерборде и в `room.participants` (не удаляется). Реконнект по тому же
  `userId` восстанавливает `score` и текущее состояние вопроса.
- **Идемпотентность ответа**: `participant.currentAnswer !== null` блокирует
  повторный `submit_answer` на тот же вопрос.
- **Поздние ответы**: отклоняются, если статус уже не `QUESTION` **или**
  `Date.now() > room.currentDeadline` — проверка на сервере, не на клиенте.
- **Невалидные payload'ы**: любые события парсятся через zod; на ошибку
  парсинга сервер просто отвечает `accepted:false`/`room_error`, не падает.

## Персист в БД

- При входе участника — upsert `SessionParticipant` (уникально по
  `sessionId+userId`).
- При закрытии вопроса — на каждого участника создаётся `ParticipantAnswer`
  (включая тех, кто не ответил — с `selectedOptionIds: []`, `isCorrect:
  false`) и инкрементируется `SessionParticipant.totalScore`.
- При старте — `Session.status = IN_PROGRESS`, `startedAt`.
- При завершении — `Session.status = FINISHED`, `endedAt`.

На этих данных построены `/history` (участник) и `/host-history`
(организатор) — см. `src/lib/history-queries.ts`.
