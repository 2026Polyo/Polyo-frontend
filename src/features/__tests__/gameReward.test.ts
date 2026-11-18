import { describe, expect, it, vi } from "vitest";
import { CreditApiError } from "../../api/credit";
import { createGameRewardSession } from "../gameReward";

const reward = {
  rewardId: "reward_1",
  gameId: "game_1",
  earnedCoin: 12,
  coinAfterReward: 112,
};

describe("game reward settlement session", () => {
  it("never requests rewards for normal games, even when claim is called repeatedly", async () => {
    const settle = vi.fn().mockResolvedValue(reward);
    const session = createGameRewardSession(
      { gameId: "game_normal", mode: "normal" },
      settle,
    );
    await session.claim();
    await session.claim();
    expect(session.getSnapshot()).toEqual({ status: "ineligible" });
    expect(settle).not.toHaveBeenCalled();
  });
  it("displays only the server result without applying a local score-to-coin formula", async () => {
    const session = createGameRewardSession(
      { gameId: "game_1", mode: "hard" },
      async () => ({ ...reward, earnedCoin: 0 }),
    );
    await session.claim();
    expect(session.getSnapshot()).toMatchObject({
      status: "success",
      reward: { earnedCoin: 0 },
    });
  });
  it("coalesces repeated calls and caches a successful result", async () => {
    const settle = vi.fn().mockResolvedValue(reward);
    const session = createGameRewardSession(
      { gameId: "game_1", mode: "hard" },
      settle,
    );
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    const first = session.claim();
    expect(session.claim()).toBe(first);
    expect(session.getSnapshot().status).toBe("pending");
    await first;
    await session.claim();
    expect(settle).toHaveBeenCalledExactlyOnceWith("game_1");
    expect(session.getSnapshot()).toEqual({ status: "success", reward });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
  it("retries the same game after an uncertain network failure", async () => {
    const settle = vi
      .fn()
      .mockRejectedValueOnce(
        new CreditApiError("CREDIT_NETWORK_ERROR", 0, true),
      )
      .mockResolvedValueOnce(reward);
    const session = createGameRewardSession(
      { gameId: "game_1", mode: "hard" },
      settle,
    );
    await session.claim();
    expect(session.getSnapshot()).toMatchObject({
      status: "error",
      retryable: true,
    });
    await session.claim();
    expect(settle.mock.calls).toEqual([["game_1"], ["game_1"]]);
    expect(session.getSnapshot()).toEqual({ status: "success", reward });
  });
  it("stops repeated requests on authentication failure", async () => {
    const settle = vi
      .fn()
      .mockRejectedValue(new CreditApiError("AUTH_UNAUTHORIZED", 401, false));
    const session = createGameRewardSession(
      { gameId: "game_1", mode: "hard" },
      settle,
    );
    await session.claim();
    await session.claim();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot()).toMatchObject({
      status: "error",
      retryable: false,
    });
  });
  it("does not reuse a reward between game sessions", async () => {
    const settle = vi
      .fn()
      .mockImplementation(async (gameId: string) => ({ ...reward, gameId }));
    await createGameRewardSession(
      { gameId: "game_1", mode: "hard" },
      settle,
    ).claim();
    await createGameRewardSession(
      { gameId: "game_2", mode: "hard" },
      settle,
    ).claim();
    expect(settle.mock.calls).toEqual([["game_1"], ["game_2"]]);
  });
  it("does not publish successful state for an unrelated game result", async () => {
    const session = createGameRewardSession(
      { gameId: "game_1", mode: "hard" },
      async () => ({ ...reward, gameId: "other" }),
    );
    await session.claim();
    expect(session.getSnapshot()).toMatchObject({ status: "error" });
  });
  it("handles a synchronously throwing transport", async () => {
    const session = createGameRewardSession(
      { gameId: "game_1", mode: "hard" },
      () => {
        throw new Error("transport failed");
      },
    );
    await session.claim();
    expect(session.getSnapshot()).toMatchObject({
      status: "error",
      retryable: true,
    });
  });
});
