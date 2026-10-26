import { afterEach, describe, expect, it, vi } from "vitest";
import { createCreditApi } from "../credit";

const reward = {
  rewardId: "reward_1",
  gameId: "game_1",
  earnedCoin: 12,
  coinAfterReward: 112,
};
function transport(body: unknown, status = 200) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
afterEach(() => vi.useRealTimers());

describe("credit API", () => {
  it.each([200, 201])(
    "sends only the server game ID and accepts settlement status %i",
    async (status) => {
      const fetcher = transport({ success: true, data: reward }, status);
      const api = createCreditApi({
        baseUrl: "https://example.test/",
        fetcher,
      });
      await expect(api.claimGameReward("game_1")).resolves.toEqual(reward);
      const [url, init] = fetcher.mock.calls[0];
      expect(url).toBe("https://example.test/api/credit/v11/game-rewards");
      expect(init).toMatchObject({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"gameId":"game_1"}',
      });
      expect(init?.headers).not.toHaveProperty("X-User-Id");
    },
  );
  it("reads zero balance without treating it as a missing balance", async () => {
    const api = createCreditApi({
      baseUrl: "https://example.test",
      fetcher: transport({ success: true, data: { coin: 0 } }),
    });
    await expect(api.getBalance()).resolves.toEqual({ coin: 0 });
  });
  it("accepts zero earned coins", async () => {
    const api = createCreditApi({
      baseUrl: "https://example.test",
      fetcher: transport({ success: true, data: { ...reward, earnedCoin: 0 } }),
    });
    expect((await api.claimGameReward("game_1")).earnedCoin).toBe(0);
  });
  it.each([
    { ...reward, gameId: "other_game" },
    { ...reward, earnedCoin: -1 },
    { ...reward, earnedCoin: 1.5 },
    { ...reward, coinAfterReward: Number.MAX_SAFE_INTEGER + 1 },
    { ...reward, rewardId: "" },
    { ...reward, earnedCoin: "12" },
  ])("rejects invalid or unrelated reward payloads", async (data) => {
    const api = createCreditApi({
      baseUrl: "https://example.test",
      fetcher: transport({ success: true, data }),
    });
    await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
      code: "CREDIT_INVALID_RESPONSE",
    });
  });
  it("does not send invalid game IDs", async () => {
    const fetcher = transport({});
    await expect(
      createCreditApi({ baseUrl: "/backend", fetcher }).claimGameReward(" "),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST_BODY" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves authentication failure and does not retry it", async () => {
    const api = createCreditApi({
      baseUrl: "/backend",
      fetcher: transport(
        { success: false, error: { code: "AUTH_UNAUTHORIZED" } },
        401,
      ),
    });
    await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
      status: 401,
      retryable: false,
    });
  });
  it.each([
    { status: 401, body: "", code: "AUTH_UNAUTHORIZED" },
    { status: 403, body: "<html>Forbidden</html>", code: "ACCESS_DENIED" },
  ])(
    "does not retry non-JSON authentication errors with status $status",
    async ({ status, body, code }) => {
      const api = createCreditApi({
        baseUrl: "/backend",
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(body, { status })),
      });

      await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
        code,
        status,
        retryable: false,
      });
    },
  );
  it.each([401, 403])(
    "prioritizes HTTP %i over a retryable error code",
    async (status) => {
      const api = createCreditApi({
        baseUrl: "/backend",
        fetcher: transport(
          { success: false, error: { code: "CREDIT_GAME_NOT_FINISHED" } },
          status,
        ),
      });

      await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
        status,
        retryable: false,
      });
    },
  );
  it("allows manual retry when game verification is pending", async () => {
    const api = createCreditApi({
      baseUrl: "/backend",
      fetcher: transport(
        { success: false, error: { code: "CREDIT_GAME_RESULT_NOT_VERIFIED" } },
        409,
      ),
    });
    await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
      retryable: true,
    });
  });
  it("never treats error HTTP status as a success", async () => {
    const api = createCreditApi({
      baseUrl: "/backend",
      fetcher: transport({ success: true, data: reward }, 503),
    });
    await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
      status: 503,
      retryable: true,
    });
  });
  it("handles non-JSON responses", async () => {
    const api = createCreditApi({
      baseUrl: "/backend",
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("<html>error</html>", { status: 502 })),
    });
    await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
      code: "CREDIT_INVALID_RESPONSE",
    });
  });
  it("handles network failure without assuming payment failed", async () => {
    const api = createCreditApi({
      baseUrl: "/backend",
      fetcher: vi
        .fn<typeof fetch>()
        .mockRejectedValue(new TypeError("offline")),
    });
    await expect(api.claimGameReward("game_1")).rejects.toMatchObject({
      code: "CREDIT_NETWORK_ERROR",
      retryable: true,
    });
  });
  it("bounds stalled requests and aborts the transport", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise(() => {}));
    const api = createCreditApi({
      baseUrl: "/backend",
      fetcher,
      timeoutMs: 50,
    });
    const assertion = expect(
      api.claimGameReward("game_1"),
    ).rejects.toMatchObject({ code: "CREDIT_REQUEST_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
