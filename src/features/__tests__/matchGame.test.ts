import { describe, expect, it } from "vitest";
import { EMPTY_CURSOR, gameAfterWaiting, getCursorPreview, getMatchSocketUrl, getTrophyResult, parseServerMessage, sameCursor } from "../matchGame";
import type { MatchGameState } from "../matchGame";

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

describe("CURSOR messages", () => {
  it("accepts a relayed cursor, with or without a position", () => {
    expect(parseServerMessage('{"type":"CURSOR","userId":"2","pieceUid":"x","row":3,"col":-1}'))
      .toEqual({ type: "CURSOR", userId: "2", pieceUid: "x", row: 3, col: -1 });
    expect(parseServerMessage('{"type":"CURSOR","userId":"2","pieceUid":null,"row":null,"col":null}')?.type).toBe("CURSOR");
  });

  it("rejects malformed cursors", () => {
    expect(parseServerMessage('{"type":"CURSOR","userId":"2","pieceUid":"x","row":3,"col":null}')).toBeNull();
    expect(parseServerMessage('{"type":"CURSOR","userId":"2","pieceUid":"x","row":8,"col":0}')).toBeNull();
    expect(parseServerMessage('{"type":"CURSOR","userId":"2","pieceUid":"x","row":1.5,"col":0}')).toBeNull();
    expect(parseServerMessage('{"type":"CURSOR","userId":"2","pieceUid":7,"row":0,"col":0}')).toBeNull();
    expect(parseServerMessage('{"type":"CURSOR","pieceUid":"x","row":0,"col":0}')).toBeNull();
  });

  it("compares cursors by value", () => {
    expect(sameCursor({ pieceUid: "x", row: 1, col: 2 }, { pieceUid: "x", row: 1, col: 2 })).toBe(true);
    expect(sameCursor({ pieceUid: "x", row: 1, col: 2 }, EMPTY_CURSOR)).toBe(false);
  });
});

describe("getCursorPreview", () => {
  const piece = { uid: "L", id: "l", cells: [[0, 0], [1, 0], [1, 1]] as [number, number][], color: "cyan" };
  const tray = [null, piece];

  it("covers the held piece's cells at the aimed spot", () => {
    expect(getCursorPreview({ pieceUid: "L", row: 2, col: 3 }, tray)).toEqual({ piece, cells: new Set(["2-3", "3-3", "3-4"]) });
  });

  it("keeps the piece but no cells while it is off the board", () => {
    expect(getCursorPreview({ pieceUid: "L", row: null, col: null }, tray)?.cells.size).toBe(0);
  });

  it("drops cells outside the board", () => {
    expect(getCursorPreview({ pieceUid: "L", row: 7, col: 7 }, tray)?.cells).toEqual(new Set(["7-7"]));
  });

  it("shows nothing for an empty hand or a block no longer in the tray", () => {
    expect(getCursorPreview(EMPTY_CURSOR, tray)).toBeNull();
    expect(getCursorPreview({ pieceUid: "gone", row: 0, col: 0 }, tray)).toBeNull();
    expect(getCursorPreview(null, tray)).toBeNull();
  });
});

describe("gameAfterWaiting", () => {
  const playing = { ...state, status: "PLAYING" } as unknown as MatchGameState;
  const finished = { ...state, status: "FINISHED", winnerUserId: "1", finishReason: "FORFEIT" } as unknown as MatchGameState;

  it("drops a game that ended while the socket was away", () => {
    expect(gameAfterWaiting(playing)).toBeNull();
  });

  it("keeps a finished result up until the player goes back to the waiting room", () => {
    expect(gameAfterWaiting(finished)).toBe(finished);
    expect(gameAfterWaiting(null)).toBeNull();
  });
});

describe("getTrophyResult", () => {
  // The backend's finished STATE: one top-level reward for the winner (TrophyService.TROPHIES_PER_WIN = 30).
  const finishedWith = (trophyReward: unknown) => ({
    ...state, status: "FINISHED", winnerUserId: "1", finishReason: "NO_MOVES", trophyReward
  }) as unknown as MatchGameState;

  it("returns the trophies the server gave the winner", () => {
    expect(getTrophyResult(finishedWith({ userId: "1", gained: 30, trophy: 90 }), "1")).toEqual({ delta: 30, trophyCount: 90 });
  });

  it("shows nothing to the loser, whose count does not change", () => {
    expect(getTrophyResult(finishedWith({ userId: "1", gained: 30, trophy: 90 }), "2")).toBeNull();
  });

  it("shows nothing while the game runs, after a failed save or on servers without trophies", () => {
    const playing = { ...finishedWith({ userId: "1", gained: 30, trophy: 30 }), status: "PLAYING" } as MatchGameState;
    expect(getTrophyResult(playing, "1")).toBeNull();
    expect(getTrophyResult(finishedWith(null), "1")).toBeNull();
    expect(getTrophyResult(finishedWith(undefined), "1")).toBeNull();
    expect(getTrophyResult(null, "1")).toBeNull();
  });

  it("ignores values that cannot be a real reward", () => {
    for (const reward of [
      { userId: "1", gained: -30, trophy: 30 },
      { userId: "1", gained: 0, trophy: 30 },
      { userId: "1", gained: 1.5, trophy: 30 },
      { userId: "1", gained: 30, trophy: 10 },
      { userId: "1", gained: "30", trophy: 30 },
      { userId: 1, gained: 30, trophy: 30 },
      { userId: "1", gained: 30, trophy: Number.MAX_SAFE_INTEGER + 1 },
      "30"
    ]) {
      expect(getTrophyResult(finishedWith(reward), "1")).toBeNull();
    }
  });

  it("still parses a finished state that carries a reward", () => {
    const message = { ...finishedWith({ userId: "1", gained: 30, trophy: 30 }), type: "STATE" };
    expect(parseServerMessage(JSON.stringify(message))).toMatchObject({ type: "STATE", trophyReward: { gained: 30 } });
  });
});
