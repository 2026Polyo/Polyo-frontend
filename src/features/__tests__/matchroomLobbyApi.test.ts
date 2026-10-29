import { describe, expect, it, vi } from "vitest";
import { createMatchRoomApi } from "../matchroomApi";
import { ENTRY_CODE_PATTERN, normalizeEntryCode } from "../matchroom";

const summary = {
  roomId: 101, roomName: "같이 한 판", hostUserId: "12", hostNickname: "폴리오", isPrivate: false,
  maxPlayers: 2, playerCount: 1, status: "WAITING", createdAt: "2026-10-23T00:00:00Z"
};
const details = {
  ...summary, entryCode: "K7M3PX9Q", playerCount: 2, status: "FULL",
  members: [{ userId: "12", nickname: "폴리오" }, { userId: "34", nickname: "친구" }]
};
const page = { rooms: [summary], page: 0, size: 20, totalElements: 1, totalPages: 1 };
const signal = () => new AbortController().signal;

function successResponse(data: unknown, init?: ResponseInit): Response {
  return Response.json({ success: true, data, error: null }, init);
}

describe("room listing", () => {
  it("requests a zero-based page with credentials and no request body", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse({ ...page, page: 2 }));
    const result = await createMatchRoomApi({ fetcher }).list(2, signal());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/api/match-room?page=2&size=20", {
      method: "GET", credentials: "include", headers: { Accept: "application/json" }, signal: expect.any(AbortSignal)
    });
    expect(result.page).toBe(2);
  });

  it("accepts empty rooms and full/private waiting rooms", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(successResponse({ ...page, rooms: [], totalElements: 0, totalPages: 0 }))
      .mockResolvedValueOnce(successResponse({ ...page, rooms: [{ ...summary, isPrivate: true, status: "FULL", playerCount: 2 }] }));
    const api = createMatchRoomApi({ fetcher });
    expect((await api.list(0, signal())).rooms).toEqual([]);
    expect((await api.list(0, signal())).rooms[0]).toMatchObject({ isPrivate: true, status: "FULL" });
  });

  it.each([-1, 0.5, NaN, Infinity])("rejects invalid page %s before sending", async (invalidPage) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(createMatchRoomApi({ fetcher }).list(invalidPage, signal())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { ...page, rooms: [{ ...summary, status: "PLAYING", playerCount: 2 }] },
    { ...page, rooms: [{ ...summary, status: "FULL", playerCount: 1 }] },
    { ...page, rooms: [{ ...summary, hostNickname: null }] },
    { ...page, rooms: [{ ...summary, hostUserId: 12 }] },
    { ...page, rooms: [{ ...summary, hostUserId: " " }] },
    { ...page, totalPages: -1 }, { ...page, size: 101 }, { ...page, rooms: null }
  ])("rejects invalid list responses", async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(body));
    await expect(createMatchRoomApi({ fetcher }).list(0, signal())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("shows a list-specific network error without retrying", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(createMatchRoomApi({ fetcher }).list(0, signal())).rejects.toMatchObject({ code: "NETWORK_ERROR", message: expect.stringContaining("방 목록") });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("room entry", () => {
  it("joins a public room by ID with no body or client-supplied user ID", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(details));
    expect(await createMatchRoomApi({ fetcher }).joinById(101, signal())).toEqual(details);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/api/match-room/101/members", {
      method: "POST", credentials: "include", headers: { Accept: "application/json" }, signal: expect.any(AbortSignal)
    });
  });

  it("normalizes a code and sends it in JSON to the fixed code route", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse({ ...details, isPrivate: true }));
    await createMatchRoomApi({ fetcher }).joinByCode(" k7m3px9q ", signal());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/api/match-room/code/members", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ entryCode: "K7M3PX9Q" }), signal: expect.any(AbortSignal)
    });
  });

  it.each(["", " ", "K7M3PX9", "K7M3PX9QQ", "I7M3PX9Q", "O7M3PX9Q", "07M3PX9Q", "17M3PX9Q", "K7M3 PX9"])("rejects invalid code %j before sending", async (entryCode) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(createMatchRoomApi({ fetcher }).joinByCode(entryCode, signal())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN])("rejects invalid room ID %s", async (roomId) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(createMatchRoomApi({ fetcher }).joinById(roomId, signal())).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [403, "ROOM_CODE_REQUIRED", "코드가 필요"],
    [404, "ROOM_NOT_FOUND", "방을 찾을 수 없어요"],
    [409, "ROOM_FULL", "정원이 가득"],
    [409, "MATCH_ALREADY_STARTED", "이미 게임이 시작"],
    [401, "UNAUTHENTICATED", "로그인이 필요"]
  ])("maps entry error %s %s", async (status, code, message) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: false, data: null, error: { code, message: "internal" } }, { status }));
    await expect(createMatchRoomApi({ fetcher }).joinByCode("K7M3PX9Q", signal())).rejects.toMatchObject({ code, message: expect.stringContaining(message) });
  });

  it("reads nested error.code rather than a conflicting top-level code", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      success: false, data: null, code: "ROOM_FULL",
      error: { code: "ROOM_NOT_FOUND", message: "internal detail" }
    }, { status: 404 }));
    await expect(createMatchRoomApi({ fetcher }).joinById(101, signal())).rejects.toMatchObject({
      code: "ROOM_NOT_FOUND", message: expect.stringContaining("방을 찾을 수 없어요")
    });
  });

  it("accepts an existing member rejoining a private, playing room", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse({ ...details, isPrivate: true, status: "PLAYING" }));
    expect((await createMatchRoomApi({ fetcher }).joinById(101, signal())).status).toBe("PLAYING");
  });

  it.each([
    { ...details, members: [{ userId: "12", nickname: "a" }, { userId: "12", nickname: "a" }] },
    { ...details, members: [{ userId: "34", nickname: "a" }, { userId: "56", nickname: "b" }] },
    { ...details, members: [{ userId: "12", nickname: "a" }, { userId: 34, nickname: "b" }] },
    { ...details, members: [{ userId: "12", nickname: "a" }, { userId: " ", nickname: "b" }] },
    { ...details, entryCode: "wrong" }, { ...details, status: "UNKNOWN" }
  ])("rejects malformed participant responses", async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(body));
    await expect(createMatchRoomApi({ fetcher }).joinById(101, signal())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("asks to rejoin the same room after connection loss", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Offline"));
    await expect(createMatchRoomApi({ fetcher }).joinById(101, signal())).rejects.toMatchObject({ code: "NETWORK_ERROR", message: expect.stringContaining("같은 방이나 코드") });
  });

  it("uses the same normalization as the code form", () => {
    expect(normalizeEntryCode(" k7m3px9q \n")).toBe("K7M3PX9Q");
    expect(ENTRY_CODE_PATTERN.test(normalizeEntryCode(" k7m3px9q "))).toBe(true);
  });
});
