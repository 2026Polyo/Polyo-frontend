import { PIXEL_EFFECT_LIFETIME_MS } from "./boardFeedback";
import { CAT_PAW_LIFETIME_MS, CAT_SLAM_LIFETIME_MS } from "./catFeedback";
import type { GameTheme } from "./gameThemes";
import { JELLY_EFFECT_LIFETIME_MS } from "./jellyFeedback";
import { MINECRAFT_EFFECT_LIFETIME_MS } from "./minecraftFeedback";
import { NEON_HOLE_LIFETIME_MS } from "./neonBlackHole";

/** 3줄 이상 제거 시 네온 블랙홀·고양이 슬램 같은 큰 연출로 바뀐다. */
export const BIG_CLEAR_LINE_COUNT = 3;

/**
 * 한 번의 제거로 보드에 재생되는 테마 제거 연출의 길이(ms).
 * 각 테마의 BoardEffects 컴포넌트가 쓰는 수명 상수와 같은 값을 돌려준다.
 * 제거된 칸이 없으면 제거 연출도 없으므로 0이다.
 */
export function getClearEffectDurationMs(
  effects: GameTheme["effects"],
  clearedCellCount: number,
  clearedLines: number,
): number {
  if (clearedCellCount <= 0) return 0;
  const bigClear = clearedLines >= BIG_CLEAR_LINE_COUNT;
  switch (effects) {
    case "pixel":
      return bigClear ? NEON_HOLE_LIFETIME_MS : PIXEL_EFFECT_LIFETIME_MS;
    case "cat":
      return bigClear ? CAT_SLAM_LIFETIME_MS : CAT_PAW_LIFETIME_MS;
    case "jelly":
      return JELLY_EFFECT_LIFETIME_MS;
    case "minecraft":
      return MINECRAFT_EFFECT_LIFETIME_MS;
    case "classic":
      return 0;
  }
}
