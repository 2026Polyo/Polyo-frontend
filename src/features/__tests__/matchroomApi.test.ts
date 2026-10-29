import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoomApi } from "../matchroomApi";

const room = {
  roomId: 101, roomName: "같이 한 판", hostUserId: "12", isPrivate: true,
  entryCode: "K7M3PX9Q", maxPlayers: 2, playerCount: 1, status: "WAITING",
  members: [{ userId: "12", nickname: "폴리오" }], createdAt: "2026-10-23T00:00:00Z"
};
const input = { roomName: "  같이 한 판  ", isPrivate: true };
const signal = () => new AbortController().signal;

function successResponse(data: unknown, init?: ResponseInit): Response {
  return Response.json({ success: true, data, error: null }, init);
}

afterEach(() => vi.useRealTimers());

describe("create room API", () => {
  it("posts the exact JSON contract and unwraps data from the backend success response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(room, { status: 201 }));
    const result = await createRoomApi({ baseUrl: "https://api.example.test/", fetcher })(input, signal());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("https://api.example.test/api/match-room", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ roomName: "같이 한 판", isPrivate: true }), signal: expect.any(AbortSignal)
    });
    expect(result).toEqual(room);
  });

  it("preserves nonnumeric string user IDs supplied by authentication", async () => {
    const data = { ...room, hostUserId: "auth0|host-12", members: [{ userId: "auth0|host-12", nickname: "폴리오" }] };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(data, { status: 201 }));
    expect(await createRoomApi({ fetcher })(input, signal())).toEqual(data);
  });

  it("uses same-origin path by default", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(room, { status: 201 }));
    await createRoomApi({ fetcher })(input, signal());
    expect(fetcher.mock.calls[0][0]).toBe("/api/match-room");
  });

  it.each([
    [400, "INVALID_REQUEST", "방 이름과 공개 설정"],
    [401, "UNAUTHENTICATED", "로그인이 필요"],
    [500, "INTERNAL_SERVER_ERROR", "일시적인 서버 오류"]
  ])("handles %s by error code, hiding arbitrary server messages", async (status, code, text) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: false, data: null, error: { code, message: "internal detail" } }, { status }));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toMatchObject({ code, message: expect.stringContaining(text) });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("handles non-JSON authentication failures", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toThrow("로그인이 필요");
  });

  it("handles unrecognized error codes safely", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: false, data: null, error: { code: "constructor", message: "internal detail" } }, { status: 503 }));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toMatchObject({ code: "constructor", message: expect.stringContaining("처리하지 못했어요") });
  });

  it("clears the timeout after a successful response", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(room, { status: 201 }));
    await createRoomApi({ fetcher })(input, signal());
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    { ...room, entryCode: "INVALID0" }, { ...room, roomId: -1 },
    { ...room, maxPlayers: 4 }, { ...room, status: "FULL" },
    { ...room, members: [] }, { ...room, createdAt: "bad-date" },
    { ...room, hostUserId: 12 }, { ...room, hostUserId: " " },
    { ...room, members: [{ userId: 12, nickname: "폴리오" }] },
    { ...room, hostUserId: " ", members: [{ userId: " ", nickname: "폴리오" }] }, null
  ])("rejects malformed success responses without inventing a room", async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(body, { status: 201 }));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it.each([
    room,
    { data: room, error: null },
    { success: false, data: room, error: null },
    { success: "true", data: room, error: null },
    { success: true, data: room },
    { success: true, data: room, error: { code: "INTERNAL_SERVER_ERROR" } },
    { success: true, data: null, error: null }
  ])("rejects an invalid common response envelope", async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status: 201 }));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("requires 201 even when a 200 response contains valid room data", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(successResponse(room));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("requires 201 and does not treat HTML as successful creation", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>app</html>", { status: 200 }));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("preserves result uncertainty on network failure without automatically retrying", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(createRoomApi({ fetcher })(input, signal())).rejects.toMatchObject({ code: "NETWORK_ERROR", message: expect.stringContaining("생성됐을 수") });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input before sending a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(createRoomApi({ fetcher })({ roomName: " ", isPrivate: false }, signal())).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("aborts timed-out requests and clears the timer", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const request = createRoomApi({ fetcher, timeoutMs: 100 })(input, signal());
    const assertion = expect(request).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("propagates unmount cancellation and skips already aborted requests", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const api = createRoomApi({ fetcher });
    const request = api(input, controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    await expect(api(input, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
