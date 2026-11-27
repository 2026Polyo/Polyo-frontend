import {
  createVisualRandom,
  uniqueFeedbackCells,
  type BoardFeedback,
  type FeedbackCell,
} from "./boardFeedback";
import { SIZE } from "../../mocks/gameData";
import { getCatConnections } from "./catConnections";
import type { Board } from "../../types";
import type { SpecialPieceGroups } from "../../types";
import { catConnectionGroup } from "./specialAppearance";

export const CAT_PAW_PRESS_MS = 460;
export const CAT_PAW_STAGGER_MS = 40;
export const CAT_PAW_MAX_STAGGER_MS = 280;
export const CAT_PAW_LIFETIME_MS =
  CAT_PAW_PRESS_MS + CAT_PAW_MAX_STAGGER_MS + 60;
export const CAT_SLAM_IMPACT_MS = 344;
export const CAT_STICKER_FLIGHT_MS = 1700;
export const CAT_SLAM_LIFETIME_MS =
  CAT_SLAM_IMPACT_MS + CAT_STICKER_FLIGHT_MS + 60;

export function createCatSlamMotion(
  cells: readonly FeedbackCell[],
  random = createVisualRandom(),
) {
  return {
    stickerIndex: Math.floor(random() * cells.length),
    flights: cells.map(({ row, col }) => {
      // A shared impact sends pieces outwards; the spread gives each its own trajectory.
      const heading = Math.atan2(row + 0.5 - SIZE / 2, col + 0.5 - SIZE / 2);
      const angle = heading + (random() - 0.5) * Math.PI * 0.85;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const edgeX = (x > 0 ? SIZE - col - 0.5 : col + 0.5) / Math.abs(x);
      const edgeY = (y > 0 ? SIZE - row - 0.5 : row + 0.5) / Math.abs(y);
      const distance = Math.min(edgeX, edgeY) / SIZE + 0.28 + random() * 0.4;
      return {
        x: x * distance,
        y: y * distance,
        duration: 610 + random() * 280,
        depth: 0.25 + random() * 1.1,
        roll: (random() - 0.5) * 560,
        pitch: (random() - 0.5) * 440,
      };
    }),
  };
}

type CatSlamFlight = ReturnType<typeof createCatSlamMotion>["flights"][number];

export function getCatFlightKeyframes(
  flight: CatSlamFlight,
  boardWidth: number,
): Keyframe[] {
  const contactMs = 29;
  const flightSeconds = (flight.duration - contactMs) / 1000;
  const gravity = 3.9;
  const liftSpeed = gravity * flightSeconds * 0.39;
  const contact =
    "perspective(750px) translate3d(0px, 0px, 0px) rotateX(0deg) rotateZ(0deg)";
  const frames: Keyframe[] = [
    { offset: 0, transform: `${contact} scale(1)`, opacity: 1 },
  ];

  for (let step = 0; step <= 12; step++) {
    const progress = step / 12;
    const time = progress * flightSeconds;
    const lift = (liftSpeed * time - 0.5 * gravity * time ** 2) * boardWidth;
    const x = flight.x * boardWidth * progress;
    const y = flight.y * boardWidth * progress - lift;
    const z = Math.max(0, lift) * flight.depth;
    frames.push({
      offset:
        (contactMs + progress * (flight.duration - contactMs)) /
        flight.duration,
      transform: `perspective(750px) translate3d(${x}px, ${y}px, ${z}px) rotateX(${flight.pitch * progress}deg) rotateZ(${flight.roll * progress}deg) scale(${step === 0 ? "1.06, .78" : "1"})`,
      opacity: progress < 0.75 ? 1 : (1 - progress) * 4,
    });
  }
  return frames;
}

/** Snapshot only occupied removed cells, in upper-left row order. Never changes game clearing time. */
export function createCatClearBatch(
  feedback: BoardFeedback,
  board: Board,
  groups: SpecialPieceGroups = {},
) {
  const cells = uniqueFeedbackCells(feedback.cleared)
    .filter(({ row, col }) => Boolean(board[row]?.[col]))
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const step = Math.min(
    CAT_PAW_STAGGER_MS,
    CAT_PAW_MAX_STAGGER_MS / Math.max(1, cells.length - 1),
  );
  return {
    id: feedback.id,
    slam: (feedback.clearedLines ?? 0) >= 3,
    cells: cells.map((cell, index) => ({
      ...cell,
      delay: index * step,
      joined: getCatConnections(
        (r, c) =>
          Boolean(board[r]?.[c]) &&
          catConnectionGroup(board, groups, cell.row, cell.col) ===
            catConnectionGroup(board, groups, r, c),
        cell.row,
        cell.col,
      ),
    })),
  };
}
export type CatClearBatch = ReturnType<typeof createCatClearBatch>;
