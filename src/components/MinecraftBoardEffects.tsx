import { memo, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  MAX_EFFECT_BATCHES,
  type BoardFeedback,
} from "../features/themes/boardFeedback";
import {
  createMinecraftEffectBatch,
  MINECRAFT_EFFECT_LIFETIME_MS,
  MINECRAFT_MINING_MS,
  MINECRAFT_ITEM_MS,
  MINECRAFT_POOF_MS,
  MINECRAFT_ITEM_END_MS,
  MINECRAFT_POOF_START_MS,
  type MinecraftClearCell,
  type MinecraftEffectBatch,
} from "../features/themes/minecraftFeedback";
import { getMinecraftAnimationStyle } from "../features/themes/minecraftMaterials";
import { useReducedMotion } from "../hooks/useReducedMotion";
import MinecraftItemCube from "./MinecraftItemCube";
import MinecraftTile from "./MinecraftTile";

const MinecraftCellEffect = memo(function MinecraftCellEffect({
  cell,
}: {
  cell: MinecraftClearCell;
}) {
  return (
    <span
      className="mc-effect-cell"
      style={
        {
          gridRow: cell.row + 1,
          gridColumn: cell.col + 1,
          "--mc-offset": `${cell.offset}ms`,
          "--mc-item-delay": `${MINECRAFT_MINING_MS + cell.offset}ms`,
          "--mc-item-duration": `${cell.itemDuration}ms`,
          "--mc-start-angle": `${cell.rotation}deg`,
        } as CSSProperties
      }
    >
      <span className="mc-mining-block">
        <MinecraftTile color={cell.color} />
        <i className="mc-mining-cracks" />
      </span>
      <span className="mc-item-stage">
        <span className="mc-item-lift">
          <MinecraftItemCube color={cell.color} />
        </span>
      </span>
      {cell.poofs.map((poof, index) => (
        <i
          className="mc-poof"
          key={index}
          style={
            {
              left: `${poof.left}%`,
              top: `${poof.top}%`,
              width: `${poof.size}px`,
              "--mc-poof-x": `${poof.x}px`,
              "--mc-poof-y": `${poof.y}px`,
              "--mc-poof-delay": `${poof.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
});

interface ActiveBatch {
  batch: MinecraftEffectBatch;
  timer: ReturnType<typeof setTimeout>;
}

export default function MinecraftBoardEffects({
  feedback,
}: {
  feedback: BoardFeedback | null;
}) {
  const reducedMotion = useReducedMotion();
  const [batches, setBatches] = useState<MinecraftEffectBatch[]>([]);
  const active = useRef<ActiveBatch[]>([]);
  const lastFeedbackId = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!feedback || reducedMotion) {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastFeedbackId.current = feedback?.id ?? null;
      setBatches([]);
      return;
    }
    if (lastFeedbackId.current === feedback.id) return;
    lastFeedbackId.current = feedback.id;
    // 새 배치로 회전 중인 아이템을 지우지 않는다. 제거가 있는 이벤트만 쌓는다.
    if (!feedback.cleared.length) return;
    const batch = createMinecraftEffectBatch(feedback);
    if (!batch.cleared.length) return;
    const retained = [...active.current];
    while (retained.length >= MAX_EFFECT_BATCHES)
      clearTimeout(retained.shift()!.timer);
    const timer = setTimeout(() => {
      active.current = active.current.filter(
        (entry) => entry.batch.id !== batch.id,
      );
      setBatches(active.current.map((entry) => entry.batch));
    }, MINECRAFT_EFFECT_LIFETIME_MS);
    active.current = [...retained, { batch, timer }];
    setBatches(active.current.map((entry) => entry.batch));
  }, [feedback, reducedMotion]);

  useLayoutEffect(
    () => () => {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastFeedbackId.current = null;
    },
    [],
  );

  if (reducedMotion || !batches.length) return null;
  return (
    <div
      className="board-minecraft-effects"
      aria-hidden="true"
      style={
        {
          ...getMinecraftAnimationStyle(),
          "--mc-mining-duration": `${MINECRAFT_MINING_MS}ms`,
          "--mc-item-duration": `${MINECRAFT_ITEM_MS}ms`,
          "--mc-poof-duration": `${MINECRAFT_POOF_MS}ms`,
          "--mc-disappear-delay": `${MINECRAFT_POOF_START_MS}ms`,
          "--mc-disappear-duration": `${MINECRAFT_ITEM_END_MS - MINECRAFT_POOF_START_MS}ms`,
        } as CSSProperties
      }
    >
      {batches.map((batch) => (
        <div
          className="mc-effect-batch"
          data-effect-id={batch.id}
          key={batch.id}
        >
          {batch.cleared.map((cell) => (
            <MinecraftCellEffect key={`${cell.row}-${cell.col}`} cell={cell} />
          ))}
        </div>
      ))}
    </div>
  );
}
