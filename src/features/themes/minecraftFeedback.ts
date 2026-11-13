import {
  createVisualRandom,
  uniqueFeedbackCells,
  type BoardFeedback,
  type FeedbackCell,
} from "./boardFeedback";

export const MINECRAFT_MINING_MS = 360;
export const MINECRAFT_ITEM_MS = 1000;
export const MINECRAFT_POOF_MS = 320;
export const MINECRAFT_STAGGER_STEP_MS = 55;
export const MINECRAFT_STAGGER_MAX_MS = 360;
export const MINECRAFT_ITEM_END_MS =
  MINECRAFT_MINING_MS + MINECRAFT_STAGGER_MAX_MS + MINECRAFT_ITEM_MS;
export const MINECRAFT_POOF_START_MS = MINECRAFT_ITEM_END_MS - 80;
export const MINECRAFT_EFFECT_LIFETIME_MS =
  MINECRAFT_ITEM_END_MS + MINECRAFT_POOF_MS + 80;
export const MINECRAFT_POOF_COUNT = 5;

export function getMinecraftStaggerStep(count: number): number {
  return Math.min(MINECRAFT_STAGGER_STEP_MS, MINECRAFT_STAGGER_MAX_MS / Math.max(1, count - 1));
}

export interface MinecraftPoof {
  x: number;
  y: number;
  left: number;
  top: number;
  size: number;
  delay: number;
}

export interface MinecraftClearCell extends FeedbackCell {
  offset: number;
  itemDuration: number;
  rotation: number;
  poofs: MinecraftPoof[];
}

export interface MinecraftEffectBatch {
  id: number;
  cleared: MinecraftClearCell[];
}

/** 게임의 난수와 진행에 관여하지 않고, 사라지기 전 블록 정보를 한 번만 기록한다. */
export function createMinecraftEffectBatch(
  feedback: BoardFeedback,
  random: () => number = createVisualRandom(),
): MinecraftEffectBatch {
  const between = (min: number, max: number) => min + random() * (max - min);
  const cleared = uniqueFeedbackCells(feedback.cleared).sort(
    (a, b) => a.row - b.row || a.col - b.col,
  );
  // 보드 전체가 제거돼도 파동 길이를 제한하고 마지막 아이템의 회전 시간을 확보한다.
  const step = getMinecraftStaggerStep(cleared.length);
  return {
    id: feedback.id,
    cleared: cleared.map((cell, index) => {
      const offset = index * step;
      const rotation = between(0, 360);
      return {
        ...cell,
        offset,
        itemDuration: MINECRAFT_ITEM_END_MS - MINECRAFT_MINING_MS - offset,
        rotation,
        poofs: Array.from({ length: MINECRAFT_POOF_COUNT }, (_, index) => {
          const angle =
            ((index + between(-0.35, 0.35)) / MINECRAFT_POOF_COUNT) *
            Math.PI *
            2;
          const distance = between(8, 22);
          return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance - 7,
            left: 50 + Math.cos(angle) * between(4, 16),
            top: 37 + Math.sin(angle) * between(4, 16),
            size: between(7, 13),
            delay: MINECRAFT_POOF_START_MS,
          };
        }),
      };
    }),
  };
}
