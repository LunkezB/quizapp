# Деплой QuizApp в продакшн

Runbook для деплоя через Docker Compose (основной путь) + reverse-proxy
nginx. Альтернатива без Docker (systemd) — в конце.

Ничего в этом документе не подключается к реальному хосту само по себе —
это инструкция, которую выполняет оператор вручную.

## Архитектура

- Один процесс `server.ts` (Next.js + Socket.IO на одном порту) — **не**
  serverless/Vercel: WebSocket-соединениям нужен постоянный процесс, а
  игровое состояние (`src/server/game-store.ts`) живёт в памяти этого
  процесса и не переживает его рестарт.
- Postgres — отдельный контейнер, недоступный снаружи (только внутренняя
  сеть compose).
- nginx на хосте — reverse proxy с TLS-терминацией и корректным
  проксированием WebSocket на `/socket.io/`.

**Важное следствие in-memory состояния**: рестарт контейнера `app`
(деплой новой версии, `docker compose restart`, OOM, краш) обнуляет все
АКТИВНЫЕ игровые комнаты — участники потеряют соединение и лобби/вопрос
придётся начать заново. Уже сыгранные и завершённые игры не теряются: их
результаты (`ParticipantAnswer`, `SessionParticipant.totalScore`,
`Session.status/endedAt`) к этому моменту уже в Postgres. Планируйте
обновления вне активных игр, либо предупреждайте пользователей.

## Предпосылки

- Домен, указывающий A-записью на IP хоста (например `quiz.example.com`).
- На хосте установлены Docker и Docker Compose plugin (`docker compose
  version`).
- Открытые порты на файрволе хоста: `80/tcp` и `443/tcp` (nginx снаружи);
  `3000/tcp` наружу открывать не нужно — compose публикует его только на
  `127.0.0.1`, nginx достаёт его локально.
- nginx установлен на хосте (не в контейнере) — этот runbook проксирует
  из host-nginx в контейнер по `127.0.0.1:3000`. Если вместо этого вы
  хотите nginx тоже в контейнере — конфиг в `deploy/nginx/quiz.conf`
  переносится туда без изменений, поменяется только адрес upstream.
- certbot установлен на хосте (`apt install certbot` или аналог) — для
  выпуска TLS-сертификата.

## Первый деплой

1. Склонировать репозиторий на хост, перейти в его корень.

2. Подготовить env-файл:

   ```bash
   cp .env.production.example .env.production
   ```

   Заполнить в `.env.production`:
   - `POSTGRES_PASSWORD` — сгенерировать: `openssl rand -base64 32`.
   - `DATABASE_URL` — та же пароль, что и `POSTGRES_PASSWORD`, хост в
     строке подключения — `postgres` (имя сервиса в compose), не
     `localhost`.
   - `JWT_SECRET` — сгенерировать: `openssl rand -base64 48`. Никогда не
     переиспользуйте значение из `.env.example`/локальной разработки.
   - `PUBLIC_ORIGIN` — ваш домен, для справки (приложением напрямую не
     используется, см. комментарий в файле).

   Права на файл:

   ```bash
   chmod 600 .env.production
   ```

3. Собрать и поднять:

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   ```

   `--env-file` обязателен: без него `${POSTGRES_PASSWORD:?...}` в
   `docker-compose.prod.yml` не подставится (Compose по умолчанию читает
   переменные для подстановки только из файла с именем `.env`, а не из
   произвольного `env_file:` внутри самого файла — здесь используется
   именно `.env.production`).

   Внутри контейнера `app` entrypoint (`deploy/docker-entrypoint.sh`)
   сам выполнит `prisma migrate deploy` перед стартом сервера — отдельно
   его запускать не нужно при первом деплое.

4. Проверить, что всё поднялось:

   ```bash
   docker compose -f docker-compose.prod.yml ps
   curl -s http://127.0.0.1:3000/api/health
   ```

   Ожидаемый ответ: `{"status":"ok","db":"ok",...}` и HTTP 200. Если
   `db":"error"` — проверьте `DATABASE_URL`/пароль и логи `postgres`.

5. Настроить nginx на хосте:

   ```bash
   sudo cp deploy/nginx/proxy-common.conf /etc/nginx/snippets/proxy-common.conf
   sudo cp deploy/nginx/quiz.conf /etc/nginx/conf.d/quiz.conf
   sudo sed -i 's/quiz.example.com/ВАШ_ДОМЕН/g' /etc/nginx/conf.d/quiz.conf
   sudo mkdir -p /var/www/certbot
   sudo nginx -t && sudo systemctl reload nginx
   ```

   На этом этапе сайт уже доступен по `http://ВАШ_ДОМЕН` (без TLS) —
   этого достаточно, чтобы certbot прошёл HTTP-01 challenge на следующем
   шаге.

6. Выпустить TLS-сертификат:

   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot -d ВАШ_ДОМЕН
   ```

   Затем в `/etc/nginx/conf.d/quiz.conf`:
   - раскомментировать весь блок `server { listen 443 ssl; ... }`;
   - заменить `quiz.example.com` на ваш домен (если ещё не заменили на
     шаге 5);
   - в блоке `server { listen 80; ... }` заменить оба `location`
     (`/socket.io/` и `/`) на единственный `return 301
     https://$host$request_uri;`, оставив `location
     /.well-known/acme-challenge/` как есть (нужен для будущих продлений
     сертификата).

   Проверить и перезагрузить:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

   certbot ставит свой таймер автопродления сам (`systemctl list-timers
   | grep certbot`) — дополнительно ничего настраивать не нужно.

7. Проверка «игра работает через wss»:
   - Открыть `https://ВАШ_ДОМЕН` в браузере, DevTools → Network → WS —
     должно появиться соединение `wss://ВАШ_ДОМЕН/socket.io/...` со
     статусом `101 Switching Protocols`.
   - На главной странице есть health-check ping/pong (см.
     `src/components/socket-status.tsx`) — нажать «Send ping» и убедиться,
     что приходит `pong`.
   - Сыграть короткую игру: организатор создаёт квиз → «Запустить» →
     код → второй браузер/вкладка в приватном режиме заходит на `/join`
     с этим кодом → «Start» → ответить на вопрос → убедиться, что
     реально показывается лидерборд. Если это работает через `wss://` в
     проде — реалтайм-слой задеплоен верно.

## Применение миграций (не при первом деплое)

Первый деплой прогоняет миграции автоматически через entrypoint. Для
последующих релизов, если вы предпочитаете применить миграции ДО того,
как новый образ подхватит трафик (например, при миграции, несовместимой
со старой версией кода):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm app npx prisma migrate deploy
```

## Обновление версии

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Это пересоберёт образ `app` (entrypoint снова прогонит `prisma migrate
deploy`, что безопасно — применяются только новые миграции) и
перезапустит только изменившийся контейнер. **Активные игры на момент
рестарта будут потеряны** — см. раздел «Архитектура» выше. Планируйте
релизы между играми или предупреждайте пользователей заранее.

## Откат

Откат образа приложения:

```bash
git checkout <предыдущий-тег-или-коммит>
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Откат миграции БД Prisma не делает автоматически (`migrate deploy`
никогда не откатывает). Если новая миграция несовместима со старым
кодом — либо откатывайте миграцию вручную написанным down-SQL, либо
держите миграции обратно совместимыми (безопасный add-only подход) и
откатывайте только код приложения.

## Логи

```bash
# приложение (stdout/stderr контейнера)
docker compose -f docker-compose.prod.yml logs -f app

# postgres
docker compose -f docker-compose.prod.yml logs -f postgres

# nginx на хосте
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

## Здоровье / мониторинг

- `GET /api/health` — реализован прямо в `server.ts` (до любого
  auth-guard'а и до Next.js), отдаёт `200 {"status":"ok","db":"ok",...}`
  если процесс жив и `SELECT 1` к Postgres проходит за 2 секунды, иначе
  `503 {"status":"error","db":"error"}`. Используется:
  - `HEALTHCHECK` в `Dockerfile`;
  - `healthcheck:` сервиса `app` в `docker-compose.prod.yml`;
  - можно навесить внешний аптайм-монитор на `https://ВАШ_ДОМЕН/api/health`.

## Альтернатива без Docker: systemd

Если Docker на хосте не используется, `deploy/systemd/quizapp.service`
запускает тот же `npm run start:prod` напрямую как systemd-юнит с
авто-рестартом. См. комментарии в самом файле — коротко:

```bash
# на хосте, из корня репозитория (например /opt/quizapp)
npm ci
npm run build
cp .env.production.example .env.production   # заполнить как в шаге 2 выше
npx prisma migrate deploy                     # миграции — вручную, юнит их не гонит

sudo cp deploy/systemd/quizapp.service /etc/systemd/system/quizapp.service
sudo systemctl daemon-reload
sudo systemctl enable --now quizapp
journalctl -u quizapp -f
```

nginx-конфиг (`deploy/nginx/quiz.conf`) и шаги TLS — те же, что и в
Docker-пути выше, независимо от способа запуска самого процесса.
