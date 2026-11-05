import { useCallback, useEffect, useRef, useState } from "react";
import { EMOTE_BUBBLE_MS } from "../features/matchLobby";
import type { EmoteId } from "../features/matchLobby";

export interface EmoteBubble {
  emote: EmoteId;
  /** Changes on every show so the pop-in animation replays for a repeated emote. */
  key: number;
}

// One bubble per player; a new emote replaces the old one and restarts its timer.
export function useEmoteBubbles() {
  const [bubbles, setBubbles] = useState<Record<string, EmoteBubble>>({});
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const nextKeyRef = useRef(0);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const show = useCallback((userId: string, emote: EmoteId) => {
    const timers = timersRef.current;
    clearTimeout(timers.get(userId));
    nextKeyRef.current += 1;
    const key = nextKeyRef.current;
    setBubbles((current) => ({ ...current, [userId]: { emote, key } }));
    timers.set(userId, setTimeout(() => {
      timers.delete(userId);
      setBubbles((current) => {
        if (current[userId]?.key !== key) return current;
        const rest = { ...current };
        delete rest[userId];
        return rest;
      });
    }, EMOTE_BUBBLE_MS));
  }, []);

  return { bubbles, show };
}
