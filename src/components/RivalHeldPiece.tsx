import { useEffect, useLayoutEffect, useState } from "react";
import type { PieceInstance } from "../types";
import { pieceBounds } from "../utils/pieceUtils";
import PieceShape from "./PieceShape";

interface RivalHeldPieceProps {
  /** Positioned container both the board and the tray live in; the ghost is placed relative to it. */
  arenaRef: React.RefObject<HTMLDivElement | null>;
  boardRef: React.RefObject<HTMLDivElement | null>;
  piece: PieceInstance;
  /** Tray slot the piece was lifted from. */
  slotIndex: number;
  /** Placement origin on the rival's board, or null while they are not aiming at a valid spot. */
  target: { row: number; col: number } | null;
}

interface GhostLayout {
  cellGap: number;
  cellSize: number;
  scale: number;
  x: number;
  y: number;
}

/** How far a lifted piece floats above its tray slot, and how small it is there. */
const SLOT_LIFT_PX = 18;
const SLOT_SCALE = 0.7;
/** Over the board: raised this many cells above where it would land, and a touch larger. */
const BOARD_LIFT_CELLS = 1;
const BOARD_SCALE = 1.06;

/** The block the rival is carrying, drawn over the arena. It rises out of its tray slot and glides
    to wherever they aim on their board. The relay only reports valid spots, so before the first one
    it waits over the slot and afterwards it stays at the last one. It disappears when the
    move lands (the piece leaves the tray) or the block is put back. */
function RivalHeldPiece({ arenaRef, boardRef, piece, slotIndex, target }: RivalHeldPieceProps) {
  const [layout, setLayout] = useState<GhostLayout | null>(null);
  // The first frame is drawn over the slot, so even a quick first aim visibly travels from the tray.
  const [lifted, setLifted] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  // While they pass over spots it cannot go, the ghost stays where it last could land.
  const [lastTarget, setLastTarget] = useState<{ row: number; col: number } | null>(null);
  const aimRow = target?.row ?? null;
  const aimCol = target?.col ?? null;
  useEffect(() => {
    if (aimRow !== null && aimCol !== null) setLastTarget({ row: aimRow, col: aimCol });
  }, [aimRow, aimCol]);
  const shown = lifted ? target ?? lastTarget : null;
  const targetRow = shown?.row ?? null;
  const targetCol = shown?.col ?? null;
  const aiming = Boolean(target);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLifted(true));
    const onResize = () => setResizeTick((tick) => tick + 1);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useLayoutEffect(() => {
    const arena = arenaRef.current;
    const board = boardRef.current;
    if (!arena || !board) return;
    const arenaRect = arena.getBoundingClientRect();
    const first = board.querySelector<HTMLElement>('[data-cell-key="0-0"]')?.getBoundingClientRect();
    const second = board.querySelector<HTMLElement>('[data-cell-key="0-1"]')?.getBoundingClientRect();
    if (!first || !second) return;
    const cellSize = first.width;
    const cellGap = Math.max(0, second.left - first.right);

    if (targetRow !== null && targetCol !== null) {
      const cell = board.querySelector<HTMLElement>(`[data-cell-key="${targetRow}-${targetCol}"]`)?.getBoundingClientRect();
      if (cell) {
        // Held up off the board like a block in hand, so the landing preview underneath stays visible.
        const bounds = pieceBounds(piece);
        const width = bounds.cols * cellSize + (bounds.cols - 1) * cellGap;
        const lift = (cellSize + cellGap) * BOARD_LIFT_CELLS;
        setLayout({
          cellGap,
          cellSize,
          scale: BOARD_SCALE,
          x: cell.left - arenaRect.left - (width * (BOARD_SCALE - 1)) / 2,
          y: cell.top - arenaRect.top - lift
        });
        return;
      }
    }

    const slot = arena.querySelectorAll<HTMLElement>(".tray > *")[slotIndex]?.getBoundingClientRect();
    if (!slot) return;
    const bounds = pieceBounds(piece);
    const width = (bounds.cols * cellSize + (bounds.cols - 1) * cellGap) * SLOT_SCALE;
    const height = (bounds.rows * cellSize + (bounds.rows - 1) * cellGap) * SLOT_SCALE;
    setLayout({
      cellGap,
      cellSize,
      scale: SLOT_SCALE,
      x: slot.left + slot.width / 2 - width / 2 - arenaRect.left,
      y: slot.top + slot.height / 2 - height / 2 - arenaRect.top - SLOT_LIFT_PX
    });
  }, [arenaRef, boardRef, piece, slotIndex, targetRow, targetCol, resizeTick]);

  if (!layout) return null;
  return (
    <div
      aria-hidden="true"
      className={`match-rival-held${targetRow === null ? " is-lifted" : aiming ? " is-aiming" : " is-off"}`}
      style={{ transform: `translate(${layout.x}px, ${layout.y}px) scale(${layout.scale})` }}
    >
      <PieceShape cellGap={layout.cellGap} cellSize={layout.cellSize} className="cursor-piece-grid" piece={piece} />
    </div>
  );
}

export default RivalHeldPiece;
