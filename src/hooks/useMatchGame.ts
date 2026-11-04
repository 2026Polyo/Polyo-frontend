import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_TOKEN_KEY } from "../api/auth";
import { FATAL_ERROR_CODES, getMatchSocketUrl, parseServerMessage } from "../features/matchGame";
import type { MatchGameState } from "../features/matchGame";

const RECONNECT_DELAY_MS = 1000;

// Keeps a game socket open for one room; the server pushes the whole state after every change.
export function useMatchGame(roomId: number) {
  const [game, setGame] = useState<MatchGameState | null>(null);
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [fatalError, setFatalError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    stoppedRef.current = false;

    function connect() {
      const url = getMatchSocketUrl(import.meta.env.VITE_API_BASE_URL ?? "", roomId, window.location);
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        socket.send(JSON.stringify({ type: "AUTH", token: localStorage.getItem(AUTH_TOKEN_KEY) ?? "" }));
      };
      socket.onmessage = (event) => {
        const received = parseServerMessage(String(event.data));
        if (!received) return;
        if (received.type === "WAITING") {
          setConnectedUserIds(received.connectedUserIds);
        } else if (received.type === "ERROR") {
          if (FATAL_ERROR_CODES.has(received.code)) {
            stoppedRef.current = true;
            setFatalError(received.message);
          } else {
            setMessage(received.message);
          }
        } else {
          setMessage("");
          setGame(received);
          if (received.status === "FINISHED") stoppedRef.current = true;
        }
      };
      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        setConnected(false);
        if (!stoppedRef.current) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();
    return () => {
      stoppedRef.current = true;
      clearTimeout(reconnectTimer);
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [roomId]);

  const send = useCallback((payload: object) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  return {
    connected,
    connectedUserIds,
    fatalError,
    game,
    message,
    place: useCallback((pieceUid: string, row: number, col: number) => send({ type: "PLACE", pieceUid, row, col }), [send]),
    forfeit: useCallback(() => send({ type: "FORFEIT" }), [send])
  };
}
