// Waiting-room rules for a two-player match: who may press what, and the game's emotes.

export const EMOTE_IDS = ["smile", "laugh", "wow", "sad", "angry", "cool"] as const;
export type EmoteId = (typeof EMOTE_IDS)[number];

export const EMOTE_LABELS: Record<EmoteId, string> = {
  smile: "미소",
  laugh: "웃음",
  wow: "놀람",
  sad: "슬픔",
  angry: "화남",
  cool: "자신만만"
};

/** How long an emote bubble stays next to a profile. */
export const EMOTE_BUBBLE_MS = 2500;
/** Minimum gap between two emotes from the same player, so repeated clicks do not flood the socket. */
export const EMOTE_COOLDOWN_MS = 800;

export function isEmoteId(value: unknown): value is EmoteId {
  return typeof value === "string" && (EMOTE_IDS as readonly string[]).includes(value);
}

export function canSendEmote(lastSentAt: number | null, now: number): boolean {
  return lastSentAt === null || now - lastSentAt >= EMOTE_COOLDOWN_MS;
}

export interface LobbyActionInput {
  isHost: boolean;
  connected: boolean;
  rivalConnected: boolean;
  myReady: boolean;
  rivalReady: boolean;
  startPending: boolean;
}

export interface LobbyAction {
  type: "start" | "ready" | "unready";
  label: string;
  disabled: boolean;
  hint: string;
}

// The host starts the game once the guest is ready; the guest only toggles ready.
export function getLobbyAction({ isHost, connected, rivalConnected, myReady, rivalReady, startPending }: LobbyActionInput): LobbyAction {
  if (isHost) {
    const hint = !connected ? "서버에 다시 연결하는 중이에요."
      : !rivalConnected ? "상대가 들어오길 기다리는 중이에요."
        : !rivalReady ? "상대가 준비하면 게임을 시작할 수 있어요."
          : startPending ? "게임을 시작하는 중이에요…" : "모두 준비됐어요!";
    return { type: "start", label: "게임 시작", disabled: !connected || !rivalConnected || !rivalReady || startPending, hint };
  }
  return {
    type: myReady ? "unready" : "ready",
    label: myReady ? "준비 취소" : "준비",
    disabled: !connected,
    hint: !connected ? "서버에 다시 연결하는 중이에요."
      : myReady ? "방장이 게임을 시작하길 기다리는 중이에요." : "준비되면 버튼을 눌러 주세요."
  };
}
