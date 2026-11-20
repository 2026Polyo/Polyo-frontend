import { describe, expect, it } from "vitest";
import { EMPTY_CURSOR, gameAfterWaiting, getCursorPreview, getMatchMoveFeedback, getMatchSocketUrl, getMatchSpecialPieceGroups, getPlayerThemeId, getTrophyResult, parseServerMessage, sameCursor } from "../matchGame";
import type { MatchGameState } from "../matchGame";

const location = { protocol: "http:", host: "127.0.0.1:5173" };

const player = { userId: "1", nickname: "a", board: [], score: 0, combo: 0, turnLimitMs: 10000, connected: true };
const state = {
  type: "STATE", status: "PLAYING", turnUserId: "1", turnRemainingMs: 9000,
  players: [player, { ...player, userId: "2" }],
  tray: [{ uid: "x", id: "square-2x2", cells: [[0, 0]], color: "cyan", special: null }, null],
  winnerUserId: null, finishReason: null, lastMove: null
};

describe("getPlayerThemeId", () => {
  it("uses the theme the server sent for the player", () => {
    expect(getPlayerThemeId({ themeId: "theme_neon" })).toBe("theme_neon");
  });

  it("falls back to classic for a missing or unknown theme", () => {
    expect(getPlayerThemeId({})).toBe("theme_classic");
    expect(getPlayerThemeId({ themeId: "theme_unknown" })).toBe("theme_classic");
  });
});

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

describe("getMatchMoveFeedback", () => {
  const empty = () => Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
  const domino = { uid: "d", id: "line-2", cells: [[0, 0], [0, 1]], color: "red", special: null };
  const other = { uid: "o", id: "dot", cells: [[0, 0]], color: "blue", special: null };
  function game(board: (string | null)[][], tray: unknown[], lastMove: unknown): MatchGameState {
    return {
      ...state, tray, lastMove,
      players: [{ ...player, board }, { ...player, userId: "2", board: empty() }]
    } as unknown as MatchGameState;
  }

  it("finds the placed piece and where it landed", () => {
    const after = empty();
    after[3][4] = after[3][5] = "red";
    const result = getMatchMoveFeedback(1, game(empty(), [domino, other], null),
      game(after, [null, other], { userId: "1", scoreGain: 2, cleared: 0, clearingCells: [] }));
    expect(result?.userId).toBe("1");
    expect(result?.color).toBe("red");
    expect(result?.feedback.placed).toEqual([{ row: 3, col: 4, color: "red" }, { row: 3, col: 5, color: "red" }]);
    expect(result?.feedback.cleared).toEqual([]);
  });

  it("keeps the colors of a cleared line, the placed cells included, after the tray refills", () => {
    const before = empty();
    for (let col = 2; col < 8; col += 1) before[0][col] = "green";
    const clearingCells = Array.from({ length: 8 }, (_, col) => `0-${col}`);
    const result = getMatchMoveFeedback(2, game(before, [null, domino, null], null),
      game(empty(), [{ ...other, uid: "n1" }, { ...other, uid: "n2" }], { userId: "1", scoreGain: 10, cleared: 1, clearingCells }));
    expect(result?.feedback.placed).toEqual([{ row: 0, col: 0, color: "red" }, { row: 0, col: 1, color: "red" }]);
    expect(result?.feedback.cleared.map((cell) => cell.color)).toEqual(["red", "red", "green", "green", "green", "green", "green", "green"]);
    // The cat theme's giant paw reads the line count, as in solo play.
    expect(result?.feedback.clearedLines).toBe(1);
  });

  it("gives up when the used piece cannot be told", () => {
    const after = empty();
    after[0][0] = "blue";
    expect(getMatchMoveFeedback(3, game(empty(), [domino, other], null),
      game(after, [], { userId: "1", scoreGain: 1, cleared: 0, clearingCells: [] }))).toBeNull();
  });

  it("gives up when no landing matches the new board", () => {
    const after = empty();
    after[5][5] = "red";
    expect(getMatchMoveFeedback(4, game(empty(), [domino, other], null),
      game(after, [null, other], { userId: "1", scoreGain: 1, cleared: 0, clearingCells: [] }))).toBeNull();
  });
});

describe("getMatchSpecialPieceGroups", () => {
  const empty = () => Array.from({ length: 8 }, () => Array<string | null>(8).fill(null));
  const ghost = (uid: string) => ({ uid, id: "ghost-line-2", cells: [[0, 0], [0, 1]], color: "ghost", special: "ghost" });
  function game(board: (string | null)[][], tray: unknown[], lastMove: unknown): MatchGameState {
    return {
      ...state, tray, lastMove,
      players: [{ ...player, board }, { ...player, userId: "2", board: empty() }]
    } as unknown as MatchGameState;
  }
  const move = { userId: "1", scoreGain: 2, cleared: 0, clearingCells: [] };

  it("joins a special piece's cells and keeps a neighbouring special piece apart", () => {
    const first = empty();
    first[2][2] = first[2][3] = "ghost";
    const second = first.map((line) => [...line]);
    second[2][4] = second[2][5] = "ghost";
    const a = getMatchMoveFeedback(1, game(empty(), [ghost("a"), ghost("b")], null), game(first, [null, ghost("b")], move));
    const afterFirst = getMatchSpecialPieceGroups({}, first, a);
    const b = getMatchMoveFeedback(2, game(first, [null, ghost("b")], null), game(second, [null, null], move));
    const groups = getMatchSpecialPieceGroups(afterFirst, second, b);
    expect(groups).toEqual({ "2-2": "a", "2-3": "a", "2-4": "b", "2-5": "b" });
  });

  it("keeps special cells apart when the placement is unknown", () => {
    const board = empty();
    board[0][0] = board[0][1] = "ghost";
    expect(getMatchSpecialPieceGroups({}, board, null)).toEqual({ "0-0": "legacy-0-0", "0-1": "legacy-0-1" });
  });
});
