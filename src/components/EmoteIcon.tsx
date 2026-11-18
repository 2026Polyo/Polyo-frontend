import type { EmoteId } from "../features/matchLobby";

// Each emote is a single block cell with a face, so it reads as part of the game rather than a stock emoji.
const BLOCK_COLORS: Record<EmoteId, string> = {
  smile: "hsl(45 95% 58%)",
  laugh: "hsl(28 92% 58%)",
  wow: "hsl(190 80% 55%)",
  sad: "hsl(215 85% 66%)",
  angry: "hsl(355 80% 62%)",
  cool: "hsl(265 70% 68%)"
};

const INK = "hsl(208 70% 15%)";

function Face({ emote }: { emote: EmoteId }) {
  const line = { fill: "none", stroke: INK, strokeLinecap: "round" as const, strokeWidth: 3 };
  switch (emote) {
    case "smile":
      return (
        <>
          <circle cx="17" cy="21" fill={INK} r="3" />
          <circle cx="31" cy="21" fill={INK} r="3" />
          <path d="M16 29 Q24 36 32 29" {...line} />
        </>
      );
    case "laugh":
      return (
        <>
          <path d="M13 22 Q17 16 21 22" {...line} />
          <path d="M27 22 Q31 16 35 22" {...line} />
          <path d="M15 27 H33 Q33 37 24 37 Q15 37 15 27 Z" fill={INK} />
          <path d="M19 33 Q24 30 29 33 Q27 36 24 36 Q21 36 19 33 Z" fill="hsl(350 85% 70%)" />
        </>
      );
    case "wow":
      return (
        <>
          <circle cx="17" cy="20" fill="white" r="5" stroke={INK} strokeWidth="2" />
          <circle cx="31" cy="20" fill="white" r="5" stroke={INK} strokeWidth="2" />
          <circle cx="17" cy="20" fill={INK} r="2" />
          <circle cx="31" cy="20" fill={INK} r="2" />
          <ellipse cx="24" cy="32" fill={INK} rx="4" ry="5" />
        </>
      );
    case "sad":
      return (
        <>
          <path d="M12 16 L20 14" {...line} />
          <path d="M36 16 L28 14" {...line} />
          <circle cx="17" cy="22" fill={INK} r="3" />
          <circle cx="31" cy="22" fill={INK} r="3" />
          <path d="M17 34 Q24 28 31 34" {...line} />
          <path d="M33 26 Q36 31 33 33 Q30 31 33 26 Z" fill="hsl(200 100% 88%)" stroke={INK} strokeWidth="1.5" />
        </>
      );
    case "angry":
      return (
        <>
          <path d="M12 15 L21 19" {...line} />
          <path d="M36 15 L27 19" {...line} />
          <circle cx="17" cy="23" fill={INK} r="3" />
          <circle cx="31" cy="23" fill={INK} r="3" />
          <path d="M17 34 Q24 29 31 34" {...line} />
        </>
      );
    case "cool":
      return (
        <>
          <path d="M10 18 H38" {...line} />
          <rect fill={INK} height="8" rx="3" width="12" x="11" y="17" />
          <rect fill={INK} height="8" rx="3" width="12" x="25" y="17" />
          <path d="M18 32 Q25 36 31 30" {...line} />
        </>
      );
  }
}

function EmoteIcon({ emote, size = 40 }: { emote: EmoteId; size?: number }) {
  return (
    <svg aria-hidden="true" focusable="false" height={size} viewBox="0 0 48 48" width={size}>
      <rect fill={BLOCK_COLORS[emote]} height="40" rx="8" stroke="hsl(208 70% 15% / 0.35)" strokeWidth="2" width="40" x="4" y="4" />
      <rect fill="white" height="5" opacity="0.35" rx="2.5" width="26" x="9" y="8" />
      <Face emote={emote} />
    </svg>
  );
}

export default EmoteIcon;
