import { memo, useId, useLayoutEffect, useMemo, useRef } from "react";
import { colorClass } from "../constants/gameData";
import "../styles/Board.css";
import type {
  Board as BoardType,
  Cell,
  PieceInstance,
  PlacementPosition,
  SpecialPieceGroups,
} from "../types";
import type { BoardFeedback } from "../features/themes/boardFeedback";
import { getThemeTileStyle } from "../features/themes/gameThemes";
import { useGameTheme } from "./ThemeScope";
import BoardEffects from "./BoardEffects";
import ThemeFieldBackground from "./ThemeFieldBackground";
import JellyBoardEffects from "./JellyBoardEffects";
import { JELLY_LANDING_MS } from "../features/themes/jellyFeedback";
import MinecraftTile from "./MinecraftTile";
import MinecraftBoardEffects from "./MinecraftBoardEffects";
import CatTile from "./CatTile";
import { getCatConnections } from "../features/themes/catConnections";
import CatDecorations from "./CatDecorations";
import type { CatCell } from "../features/themes/catRegions";
import CatBoardEffects, { CatPawDefinition } from "./CatBoardEffects";
import {
  catConnectionGroup,
  getSpecialAppearance,
} from "../features/themes/specialAppearance";
import { SPECIAL_LABELS } from "../features/specials";
const EMPTY_SPECIAL_GROUPS: SpecialPieceGroups = {};

interface BoardProps {
  specialPieceGroups?: SpecialPieceGroups;
  feedback?: BoardFeedback | null;
  board: BoardType;
  boardRef: React.RefObject<HTMLDivElement | null>;
  clearingCells: Set<string>;
  hoverCell: PlacementPosition | null;
  onCellClick: (row: number, col: number) => void;
  onCellEnter: (cell: PlacementPosition) => void;
  onCellLeave: () => void;
  previewClearingCells: Set<string>;
  previewCells: Set<string>;
  selectedPiece: PieceInstance | null;
}

type CellHandlers = Pick<BoardProps, "onCellClick" | "onCellEnter" | "onCellLeave">;

interface BoardCellProps {
  row: number;
  col: number;
  cell: Cell;
  previewColor: string | null;
  isPreview: boolean;
  isClearing: boolean;
  isPreviewClearing: boolean;
  placedId?: number;
  catConnections?: string;
  handlers: React.RefObject<CellHandlers>;
}

const BoardCell = memo(function BoardCell({
  row,
  col,
  cell,
  previewColor,
  isPreview,
  isClearing,
  isPreviewClearing,
  placedId,
  catConnections,
  handlers,
}: BoardCellProps) {
  const theme = useGameTheme();
  const renderedColor = previewColor ?? cell;
  const special = getSpecialAppearance(renderedColor);
  const specialLabel = special ? SPECIAL_LABELS[special] : undefined;
  const filledColor = cell ?? previewColor;
  const isPlaced = placedId !== undefined;

  return (
    <button
      aria-label={`${row + 1} row ${col + 1} column${specialLabel ? ` · ${specialLabel}` : ""}`}
      title={specialLabel}
      className={`board-cell ${filledColor ? colorClass[filledColor] : ""} ${isPreview ? "preview" : ""} ${isPreviewClearing ? "preview-clearing" : ""} ${isClearing ? "clearing" : ""} ${special ? "special" : ""}`}
      data-cell-key={`${row}-${col}`}
      data-filled={Boolean(filledColor)}
      data-special={special}
      style={getThemeTileStyle(theme, renderedColor)}
      onClick={() => handlers.current.onCellClick(row, col)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") {
          handlers.current.onCellEnter({ row, col });
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") handlers.current.onCellLeave();
      }}
      onFocus={() => handlers.current.onCellEnter({ row, col })}
      onBlur={() => handlers.current.onCellLeave()}
      type="button"
    >
      {theme.tileStyle === "cat" && (
        <CatTile
          row={row}
          col={col}
          color={renderedColor}
          filled={Boolean(filledColor)}
          joined={catConnections}
        />
      )}
      {theme.tileStyle === "jelly" && filledColor && (
        <span
          key={placedId ?? "rest"}
          className={`jelly-tile-face ${isPlaced ? "jelly-tile-reveal" : ""}`}
          data-special={special}
          style={isPlaced ? { animationDuration: `${JELLY_LANDING_MS}ms` } : undefined}
          aria-hidden="true"
        />
      )}
      {theme.tileStyle === "minecraft" && filledColor && (
        <MinecraftTile
          key={placedId ?? "rest"}
          color={filledColor}
          className={isPlaced ? "mc-tile-place" : ""}
        />
      )}
    </button>
  );
});

function Board({
  specialPieceGroups = EMPTY_SPECIAL_GROUPS,
  feedback = null,
  board,
  boardRef,
  clearingCells,
  hoverCell: _hoverCell,
  onCellClick,
  onCellEnter,
  onCellLeave,
  previewClearingCells,
  previewCells,
  selectedPiece,
}: BoardProps) {
  const theme = useGameTheme();
  const catPawId = useId();
  // Retain stable cell props while using the handlers from the latest game state.
  const handlers = useRef({ onCellClick, onCellEnter, onCellLeave });
  useLayoutEffect(() => {
    handlers.current = { onCellClick, onCellEnter, onCellLeave };
  }, [onCellClick, onCellEnter, onCellLeave]);

  const placedCells = useMemo(() => {
    if (
      !feedback ||
      (theme.tileStyle !== "jelly" && theme.tileStyle !== "minecraft")
    ) {
      return null;
    }
    return new Set(feedback.placed.map(({ row, col }) => `${row}-${col}`));
  }, [feedback, theme.tileStyle]);
  const catCells = useMemo(
    () =>
      theme.tileStyle === "cat"
        ? board.flatMap((row, r) =>
            row.flatMap((cell, c) =>
              cell && !clearingCells.has(`${r}-${c}`)
                ? [[r, c] as CatCell]
                : [],
            ),
          )
        : [],
    [board, clearingCells, theme.tileStyle],
  );
  const isCatFilled = (row: number, col: number) => Boolean(board[row]?.[col]);
  const isCatRemaining = (row: number, col: number) =>
    isCatFilled(row, col) && !clearingCells.has(`${row}-${col}`);
  const catClearPreview = useMemo(() => {
    if (theme.tileStyle !== "cat") return [];
    return [...previewClearingCells]
      .filter((key) => !clearingCells.has(key))
      .map((key) => {
        const [row, col] = key.split("-").map(Number);
        return { key, row, col };
      });
  }, [theme.tileStyle, previewClearingCells, clearingCells]);
  return (
    <div className="board-surface">
      <div className="board" ref={boardRef} data-game-theme={theme.id}>
        {theme.tileStyle === "cat" && <CatPawDefinition id={catPawId} />}
        {theme.background && (
          <ThemeFieldBackground background={theme.background} />
        )}
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            const isPreview = previewCells.has(key);
            const isClearing = clearingCells.has(key);
            const previewColor = isPreview ? selectedPiece?.color ?? null : null;
            let catConnections: string | undefined;
            if (theme.tileStyle === "cat") {
              const connectionGroup = catConnectionGroup(
                board,
                specialPieceGroups,
                rowIndex,
                colIndex,
              );
              catConnections = getCatConnections(
                isPreview && selectedPiece
                  ? (r, c) => previewCells.has(`${r}-${c}`)
                  : (r, c) =>
                      (isClearing ? isCatFilled(r, c) : isCatRemaining(r, c)) &&
                      connectionGroup === catConnectionGroup(board, specialPieceGroups, r, c),
                rowIndex,
                colIndex,
              );
            }

            return (
              <BoardCell
                key={key}
                row={rowIndex}
                col={colIndex}
                cell={cell}
                previewColor={previewColor}
                isPreview={isPreview}
                isClearing={isClearing}
                isPreviewClearing={previewClearingCells.has(key)}
                placedId={cell && placedCells?.has(key) ? feedback?.id : undefined}
                catConnections={catConnections}
                handlers={handlers}
              />
            );
          }),
        )}
        {theme.effects === "cat" && (
          <CatBoardEffects
            feedback={feedback}
            board={board}
            pawId={catPawId}
            specialPieceGroups={specialPieceGroups}
          />
        )}
        {theme.effects === "pixel" && <BoardEffects feedback={feedback} />}
        {catClearPreview.length > 0 && (
          <div className="cat-clear-preview" aria-hidden="true">
            {catClearPreview.map(({ key, row, col }) => (
              <svg
                key={key}
                className="cat-clear-preview-paw"
                viewBox="0 0 100 100"
                style={{ gridRow: row + 1, gridColumn: col + 1 }}
              >
                <use href={`#${catPawId}`} />
              </svg>
            ))}
          </div>
        )}
        {theme.tileStyle === "cat" && (
          <CatDecorations
            cells={catCells}
            rows={8}
            cols={8}
            board={board}
            specialPieceGroups={specialPieceGroups}
          />
        )}
        {theme.effects === "jelly" && <JellyBoardEffects feedback={feedback} />}
        {theme.effects === "minecraft" && (
          <MinecraftBoardEffects feedback={feedback} />
        )}
      </div>
    </div>
  );
}

export default Board;
