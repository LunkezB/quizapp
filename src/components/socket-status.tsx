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
    <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">Socket.IO health check</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Event: <span className="font-mono">ping</span> to{" "}
            <span className="font-mono">pong</span>
          </p>
        </div>
        <span
          className="inline-flex w-fit items-center rounded-md border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-700"
          data-testid="socket-status"
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <button
          type="button"
          className="h-11 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          disabled={!canPing}
          onClick={handlePing}
        >
          Send ping
        </button>

        <div className="min-h-11 flex-1 rounded-md bg-zinc-50 px-4 py-3 font-mono text-sm text-zinc-700">
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
