import { describe, expect, it } from "vitest";
import { canSendEmote, EMOTE_COOLDOWN_MS, EMOTE_IDS, getLobbyAction, isEmoteId } from "../matchLobby";
import type { LobbyActionInput } from "../matchLobby";

const base: LobbyActionInput = {
  isHost: true, connected: true, rivalConnected: true, myReady: false, rivalReady: true, startPending: false
};

describe("emotes", () => {
  it("has six game emotes", () => {
    expect(EMOTE_IDS).toHaveLength(6);
    expect(EMOTE_IDS.every(isEmoteId)).toBe(true);
  });

  it("rejects unknown emotes", () => {
    expect(isEmoteId("heart")).toBe(false);
    expect(isEmoteId(1)).toBe(false);
    expect(isEmoteId(undefined)).toBe(false);
  });

  it("blocks emotes sent faster than the cooldown", () => {
    expect(canSendEmote(null, 0)).toBe(true);
    expect(canSendEmote(1000, 1000 + EMOTE_COOLDOWN_MS - 1)).toBe(false);
    expect(canSendEmote(1000, 1000 + EMOTE_COOLDOWN_MS)).toBe(true);
  });
});

describe("getLobbyAction", () => {
  it("lets the host start once the rival is connected and ready", () => {
    expect(getLobbyAction(base)).toMatchObject({ type: "start", label: "게임 시작", disabled: false });
  });

  it("keeps start disabled until the rival is there and ready", () => {
    expect(getLobbyAction({ ...base, rivalConnected: false }).disabled).toBe(true);
    expect(getLobbyAction({ ...base, rivalReady: false })).toMatchObject({ disabled: true, hint: "상대가 준비하면 게임을 시작할 수 있어요." });
  });

  it("blocks a second start while the first is pending", () => {
    expect(getLobbyAction({ ...base, startPending: true }).disabled).toBe(true);
  });

  it("toggles ready for the guest", () => {
    const guest = { ...base, isHost: false, rivalReady: false };
    expect(getLobbyAction(guest)).toMatchObject({ type: "ready", label: "준비", disabled: false });
    expect(getLobbyAction({ ...guest, myReady: true })).toMatchObject({ type: "unready", label: "준비 취소" });
  });

  it("disables every action while disconnected", () => {
    expect(getLobbyAction({ ...base, connected: false }).disabled).toBe(true);
    expect(getLobbyAction({ ...base, isHost: false, connected: false }).disabled).toBe(true);
  });
});
