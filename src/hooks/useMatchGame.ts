import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_TOKEN_KEY } from "../api/auth";
import { FATAL_ERROR_CODES, getMatchSocketUrl, parseServerMessage } from "../features/matchGame";
import type { MatchGameState, MatchServerMessage, RoomClosedReason } from "../features/matchGame";
import type { EmoteId } from "../features/matchLobby";

type WaitingMessage = Extract<MatchServerMessage, { type: "WAITING" }>;

interface MatchGameOptions {
  /** Called when the server relays an emote from a player. */
  onEmote?: (userId: string, emote: EmoteId) => void;
}

const RECONNECT_DELAY_MS = 1000;

// Keeps a game socket open for one room; the server pushes the whole state after every change.
export function useMatchGame(roomId: number, { onEmote }: MatchGameOptions = {}) {
  const [game, setGame] = useState<MatchGameState | null>(null);
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  // null until the server reports who is ready; older servers never do.
  const [readyUserIds, setReadyUserIds] = useState<string[] | null>(null);
  const [members, setMembers] = useState<WaitingMessage["members"]>();
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messageCode, setMessageCode] = useState("");
  const [fatalError, setFatalError] = useState("");
  const [closedReason, setClosedReason] = useState<RoomClosedReason | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const stoppedRef = useRef(false);
  const onEmoteRef = useRef(onEmote);
  useEffect(() => {
    onEmoteRef.current = onEmote;
  }, [onEmote]);

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
          if (received.readyUserIds) setReadyUserIds(received.readyUserIds);
          if (received.members) setMembers(received.members);
        } else if (received.type === "ROOM_CLOSED") {
          // The server closes the socket next; reconnecting would only fail.
          stoppedRef.current = true;
          setClosedReason(received.reason);
        } else if (received.type === "EMOTE") {
          onEmoteRef.current?.(received.userId, received.emote);
        } else if (received.type === "ERROR") {
          if (FATAL_ERROR_CODES.has(received.code)) {
            stoppedRef.current = true;
            setFatalError(received.message);
          } else {
            setMessage(received.message);
            setMessageCode(received.code);
          }
        } else {
          setMessage("");
          setMessageCode("");
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
    closedReason,
    connected,
    connectedUserIds,
    fatalError,
    game,
    members,
    message,
    messageCode,
    readyUserIds,
    place: useCallback((pieceUid: string, row: number, col: number) => send({ type: "PLACE", pieceUid, row, col }), [send]),
    forfeit: useCallback(() => send({ type: "FORFEIT" }), [send]),
    setReady: useCallback((ready: boolean) => send({ type: "READY", ready }), [send]),
    start: useCallback(() => send({ type: "START" }), [send]),
    sendEmote: useCallback((emote: EmoteId) => send({ type: "EMOTE", emote }), [send])
  };
}
