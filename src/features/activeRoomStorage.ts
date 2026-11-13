import { isRoomDetails } from "./matchroomApi";
import type { MatchRoomDetails } from "./matchroom";

// Remembers the room this tab is in, so a refresh during a match goes back to it instead of the
// start screen. sessionStorage is per tab, so two test windows signed in as different users never
// overwrite each other. The server stays the source of truth: if the room is gone, the socket says so.
export const ACTIVE_ROOM_KEY = "polyo.activeRoom";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadActiveRoom(userId: string, storage: StorageLike | null = defaultStorage()): MatchRoomDetails | null {
  try {
    const raw = storage?.getItem(ACTIVE_ROOM_KEY);
    if (!raw) return null;
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) return null;
    const { userId: savedUserId, room } = saved as { userId?: unknown; room?: unknown };
    // Another account signed in on this tab must not land in the previous account's room.
    if (savedUserId !== userId || !isRoomDetails(room)) return null;
    return room;
  } catch {
    return null;
  }
}

export function saveActiveRoom(userId: string, room: MatchRoomDetails, storage: StorageLike | null = defaultStorage()) {
  try {
    storage?.setItem(ACTIVE_ROOM_KEY, JSON.stringify({ userId, room }));
  } catch {
    // Without storage a refresh just returns to the start screen, as before.
  }
}

export function clearActiveRoom(storage: StorageLike | null = defaultStorage()) {
  try {
    storage?.removeItem(ACTIVE_ROOM_KEY);
  } catch {
    // Nothing to clear.
  }
}
