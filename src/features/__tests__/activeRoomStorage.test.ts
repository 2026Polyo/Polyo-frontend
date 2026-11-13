import { describe, expect, it } from "vitest";
import { ACTIVE_ROOM_KEY, clearActiveRoom, loadActiveRoom, saveActiveRoom } from "../activeRoomStorage";
import type { MatchRoomDetails } from "../matchroom";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); }
  };
}

const room: MatchRoomDetails = {
  roomId: 7, roomName: "대전", hostUserId: "1", isPrivate: false, entryCode: "K7M3PX9Q", maxPlayers: 2,
  playerCount: 2, status: "PLAYING", members: [{ userId: "1", nickname: "a" }, { userId: "2", nickname: "b" }],
  createdAt: "2026-11-04T00:00:00Z"
};

describe("activeRoomStorage", () => {
  it("restores the room for the same user", () => {
    const storage = memoryStorage();
    saveActiveRoom("2", room, storage);
    expect(loadActiveRoom("2", storage)).toEqual(room);
  });

  it("does not hand one account's room to another", () => {
    const storage = memoryStorage();
    saveActiveRoom("2", room, storage);
    expect(loadActiveRoom("3", storage)).toBeNull();
  });

  it("forgets the room once cleared", () => {
    const storage = memoryStorage();
    saveActiveRoom("2", room, storage);
    clearActiveRoom(storage);
    expect(loadActiveRoom("2", storage)).toBeNull();
  });

  it("ignores broken or tampered data", () => {
    const storage = memoryStorage();
    storage.setItem(ACTIVE_ROOM_KEY, "not json");
    expect(loadActiveRoom("2", storage)).toBeNull();
    storage.setItem(ACTIVE_ROOM_KEY, JSON.stringify({ userId: "2", room: { roomId: -1 } }));
    expect(loadActiveRoom("2", storage)).toBeNull();
  });

  it("works without storage", () => {
    expect(loadActiveRoom("2", null)).toBeNull();
    expect(() => saveActiveRoom("2", room, null)).not.toThrow();
  });
});
