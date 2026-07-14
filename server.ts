import "dotenv/config";

import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "./src/lib/auth-token";
import { prisma } from "./src/lib/db";
import { readCookie } from "./src/lib/read-cookie";
import { registerGameHandlers } from "./src/server/game-socket";

type PingPayload = {
  clientSentAt?: string;
} | null;

type PongPayload = {
  event: "pong";
  received: PingPayload;
  serverTime: string;
};

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

// Next.js middleware is not reliably invoked when a custom server wraps
// getRequestHandler() together with Turbopack (a known upstream limitation),
// so protected-route enforcement is duplicated here at the HTTP layer.
const PROTECTED_PATH_PREFIXES = ["/dashboard", "/quiz", "/join", "/host", "/play", "/history", "/host-history"];

const HEALTH_CHECK_PATH = "/api/health";
const HEALTH_CHECK_DB_TIMEOUT_MS = 2000;

type HealthCheckBody = {
  status: "ok" | "error";
  db: "ok" | "error";
  uptimeSec: number;
  timestamp: string;
};

async function handleHealthCheck(response: import("node:http").ServerResponse) {
  let dbOk = false;

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("Database health check timed out")), HEALTH_CHECK_DB_TIMEOUT_MS),
      ),
    ]);
    dbOk = true;
  } catch (error) {
    console.error("Health check: database ping failed", error);
  }

  const body: HealthCheckBody = {
    status: dbOk ? "ok" : "error",
    db: dbOk ? "ok" : "error",
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  response.statusCode = dbOk ? 200 : 503;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? hostname}`);

      if (url.pathname === HEALTH_CHECK_PATH) {
        await handleHealthCheck(response);
        return;
      }

      const isProtected = PROTECTED_PATH_PREFIXES.some(
        (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
      );

      if (isProtected) {
        const token = readCookie(request.headers.cookie, AUTH_COOKIE_NAME);
        const payload = await verifyAuthToken(token);

        if (!payload) {
          const loginUrl = new URL("/login", url.origin);
          loginUrl.searchParams.set("next", url.pathname + url.search);
          response.statusCode = 307;
          response.setHeader("Location", loginUrl.pathname + loginUrl.search);
          response.end();
          return;
        }
      }

      await handle(request, response);
    } catch (error) {
      console.error("Request handling failed", error);
      response.statusCode = 500;
      response.end("Internal server error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
  });

  registerGameHandlers(io);

  io.on("connection", (socket) => {
    console.info(`Socket connected: ${socket.id}`);

    socket.on("ping", (payload: PingPayload, acknowledge?: (response: PongPayload) => void) => {
      const response: PongPayload = {
        event: "pong",
        received: payload,
        serverTime: new Date().toISOString(),
      };

      socket.emit("pong", response);
      acknowledge?.(response);
    });

    socket.on("disconnect", (reason) => {
      console.info(`Socket disconnected: ${socket.id}; reason=${reason}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.info(`Server ready on http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error("Server bootstrap failed", error);
  process.exit(1);
});
