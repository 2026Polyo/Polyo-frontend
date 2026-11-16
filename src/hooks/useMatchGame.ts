import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_TOKEN_KEY } from "../api/auth";
import { EMPTY_CURSOR, FATAL_ERROR_CODES, getMatchSocketUrl, parseServerMessage, sameCursor } from "../features/matchGame";
import type { MatchCursor, MatchGameState, MatchServerMessage, RoomClosedReason } from "../features/matchGame";
import type { EmoteId } from "../features/matchLobby";

type WaitingMessage = Extract<MatchServerMessage, { type: "WAITING" }>;

interface MatchGameOptions {
  /** Called when the server relays an emote from a player. */
  onEmote?: (userId: string, emote: EmoteId) => void;
  /** Called when the server relays the rival's held block. */
  onCursor?: (userId: string, cursor: MatchCursor) => void;
}

const RECONNECT_DELAY_MS = 1000;
/** At most one CURSOR per this interval; the latest value is always sent at the end. */
export const CURSOR_INTERVAL_MS = 100;

interface CursorSendState {
  last: MatchCursor;
  pending: MatchCursor | null;
  timer: ReturnType<typeof setTimeout> | undefined;
  /** Set once a CURSOR went out, so a following INVALID_MESSAGE can be blamed on it. */
  sent: boolean;
  /** Servers without the relay answer CURSOR with INVALID_MESSAGE; then we stop sending it. */
  unsupported: boolean;
}

// Keeps a game socket open for one room; the server pushes the whole state after every change.
export function useMatchGame(roomId: number, { onEmote, onCursor }: MatchGameOptions = {}) {
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
  const onCursorRef = useRef(onCursor);
  const cursorRef = useRef<CursorSendState>({ last: EMPTY_CURSOR, pending: null, timer: undefined, sent: false, unsupported: false });
  useEffect(() => {
    onEmoteRef.current = onEmote;
    onCursorRef.current = onCursor;
  }, [onEmote, onCursor]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    stoppedRef.current = false;

    function connect() {
      const url = getMatchSocketUrl(import.meta.env.VITE_API_BASE_URL ?? "", roomId, window.location);
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        // A new socket knows nothing of what the old one sent.
        cursorRef.current.last = EMPTY_CURSOR;
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
        } else if (received.type === "CURSOR") {
          const { pieceUid, row, col } = received;
          onCursorRef.current?.(received.userId, { pieceUid, row, col });
        } else if (received.type === "ERROR") {
          // Our client only sends malformed messages when the server does not know CURSOR.
          if (received.code === "INVALID_MESSAGE" && cursorRef.current.sent) {
            cursorRef.current.unsupported = true;
            clearTimeout(cursorRef.current.timer);
            cursorRef.current.timer = undefined;
            return;
          }
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
      clearTimeout(cursorRef.current.timer);
      cursorRef.current.timer = undefined;
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [roomId]);

  const send = useCallback((payload: object): boolean => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  // Leading-edge throttle: the first change goes out at once, later ones at most every CURSOR_INTERVAL_MS.
  const flushCursor = useCallback(() => {
    const state = cursorRef.current;
    state.timer = undefined;
    const next = state.pending;
    state.pending = null;
    if (!next || state.unsupported || sameCursor(next, state.last)) return;
    if (!send({ type: "CURSOR", ...next })) return;
    state.last = next;
    state.sent = true;
    state.timer = setTimeout(flushCursor, CURSOR_INTERVAL_MS);
  }, [send]);

  const sendCursor = useCallback((cursor: MatchCursor) => {
    const state = cursorRef.current;
    if (state.unsupported) return;
    state.pending = cursor;
    if (!state.timer) flushCursor();
  }, [flushCursor]);

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
    sendCursor,
    sendEmote: useCallback((emote: EmoteId) => { send({ type: "EMOTE", emote }); }, [send])
  };
}
