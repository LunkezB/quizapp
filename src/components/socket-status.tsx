"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

type PingPayload = {
  clientSentAt: string;
};

type PongPayload = {
  event: "pong";
  received: PingPayload | null;
  serverTime: string;
};

export function SocketStatus() {
  const socketRef = useRef<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [pong, setPong] = useState<PongPayload | null>(null);

  useEffect(() => {
    const nextSocket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    const handleConnect = () => {
      setConnectionState("connected");
      sendPing(nextSocket);
    };

    const handleDisconnect = () => {
      setConnectionState("disconnected");
    };

    const handleConnectError = () => {
      setConnectionState("error");
    };

    const handlePong = (payload: PongPayload) => {
      setPong(payload);
    };

    nextSocket.on("connect", handleConnect);
    nextSocket.on("disconnect", handleDisconnect);
    nextSocket.on("connect_error", handleConnectError);
    nextSocket.on("pong", handlePong);
    socketRef.current = nextSocket;

    return () => {
      nextSocket.off("connect", handleConnect);
      nextSocket.off("disconnect", handleDisconnect);
      nextSocket.off("connect_error", handleConnectError);
      nextSocket.off("pong", handlePong);
      nextSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const statusLabel = useMemo(() => {
    switch (connectionState) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting";
      case "disconnected":
        return "Disconnected";
      case "error":
        return "Connection error";
    }
  }, [connectionState]);

  const canPing = connectionState === "connected";

  const handlePing = () => {
    if (!socketRef.current) {
      return;
    }

    sendPing(socketRef.current, setPong);
  };

  return (
    <div className="w-full max-w-2xl rounded-[12px] border border-line bg-surface p-6 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Socket.IO health check</h2>
          <p className="mt-1 text-sm text-muted">
            Event: <span className="font-mono text-ink-soft">ping</span> to{" "}
            <span className="font-mono text-ink-soft">pong</span>
          </p>
        </div>
        <span
          className="inline-flex w-fit items-center rounded-full border border-line px-3 py-1 text-xs font-medium uppercase tracking-[0.05em] text-muted"
          data-testid="socket-status"
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <button
          type="button"
          className="h-11 rounded-[6px] bg-ink px-5 text-sm font-medium text-white transition active:scale-[0.98] hover:bg-ink-soft disabled:pointer-events-none disabled:opacity-45"
          disabled={!canPing}
          onClick={handlePing}
        >
          Send ping
        </button>

        <div className="min-h-11 flex-1 rounded-[8px] bg-surface-muted px-4 py-3 font-mono text-sm text-ink-soft">
          {pong ? (
            <span data-testid="socket-pong">
              pong at {pong.serverTime}; client sent {pong.received?.clientSentAt ?? "empty"}
            </span>
          ) : (
            <span>No pong received yet.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function sendPing(socket: Socket, onPong?: (payload: PongPayload) => void) {
  const payload: PingPayload = {
    clientSentAt: new Date().toISOString(),
  };

  socket.emit("ping", payload, (response: PongPayload) => {
    onPong?.(response);
  });
}
