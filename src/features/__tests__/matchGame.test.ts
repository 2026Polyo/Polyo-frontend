import { describe, expect, it } from "vitest";
import { getMatchSocketUrl, parseServerMessage } from "../matchGame";

const location = { protocol: "http:", host: "127.0.0.1:5173" };

const player = { userId: "1", nickname: "a", board: [], score: 0, combo: 0, turnLimitMs: 10000, connected: true };
const state = {
  type: "STATE", status: "PLAYING", turnUserId: "1", turnRemainingMs: 9000,
  players: [player, { ...player, userId: "2" }],
  tray: [{ uid: "x", id: "square-2x2", cells: [[0, 0]], color: "cyan", special: null }, null],
  winnerUserId: null, finishReason: null, lastMove: null
};

describe("getMatchSocketUrl", () => {
  it("uses the page origin when no API base is configured", () => {
    expect(getMatchSocketUrl("", 7, location)).toBe("ws://127.0.0.1:5173/ws/match/7");
  });

  it("keeps TLS for a configured API base", () => {
    expect(getMatchSocketUrl("https://api.example.com/", 7, location)).toBe("wss://api.example.com/ws/match/7");
  });
});

describe("parseServerMessage", () => {
  it("accepts a game state", () => {
    expect(parseServerMessage(JSON.stringify(state))?.type).toBe("STATE");
  });

  it("accepts waiting and error messages", () => {
    expect(parseServerMessage('{"type":"WAITING","connectedUserIds":["1"]}')?.type).toBe("WAITING");
    expect(parseServerMessage('{"type":"ERROR","code":"NOT_YOUR_TURN","message":"x"}')?.type).toBe("ERROR");
  });

  it("accepts optional ready and member lists in waiting messages", () => {
    const waiting = parseServerMessage(JSON.stringify({
      type: "WAITING", connectedUserIds: ["1", "2"], readyUserIds: ["2"], members: [{ userId: "1", nickname: "a" }]
    }));
    expect(waiting).toMatchObject({ type: "WAITING", readyUserIds: ["2"] });
  });

  it("accepts a relayed emote", () => {
    expect(parseServerMessage('{"type":"EMOTE","userId":"2","emote":"laugh"}')).toEqual({ type: "EMOTE", userId: "2", emote: "laugh" });
  });

  it("accepts a room-closed notice", () => {
    expect(parseServerMessage('{"type":"ROOM_CLOSED","reason":"ROOM_DELETED"}')).toEqual({ type: "ROOM_CLOSED", reason: "ROOM_DELETED" });
    expect(parseServerMessage('{"type":"ROOM_CLOSED","reason":"OTHER"}')).toBeNull();
  });

  it("rejects malformed lobby messages", () => {
    expect(parseServerMessage('{"type":"EMOTE","userId":"2","emote":"heart"}')).toBeNull();
    expect(parseServerMessage('{"type":"WAITING","connectedUserIds":["1"],"readyUserIds":"1"}')).toBeNull();
    expect(parseServerMessage('{"type":"WAITING","connectedUserIds":[1]}')).toBeNull();
  });

  it("rejects malformed messages", () => {
    expect(parseServerMessage("not json")).toBeNull();
    expect(parseServerMessage('{"type":"UNKNOWN"}')).toBeNull();
    expect(parseServerMessage(JSON.stringify({ ...state, players: [player] }))).toBeNull();
    expect(parseServerMessage(JSON.stringify({ ...state, tray: [{ uid: 1 }] }))).toBeNull();
  });
});
