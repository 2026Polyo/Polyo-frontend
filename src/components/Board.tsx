import { colorClass, SPECIAL_COLORS } from "../constants/gameData";
import "../styles/Board.css";
import type {
  Board as BoardType,
  PieceInstance,
  PlacementPosition,
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
import { useMemo } from "react";
import CatDecorations from "./CatDecorations";
import type { CatCell } from "../features/themes/catRegions";
import CatBoardEffects from "./CatBoardEffects";

interface BoardProps {
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

function Board({
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
  return (
    <div className="board-surface">
      <div className="board" ref={boardRef} data-game-theme={theme.id}>
        {theme.background && (
          <ThemeFieldBackground background={theme.background} />
        )}
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex}-${colIndex}`;
            const isPreview = previewCells.has(key);
            const isClearing = clearingCells.has(key);
            const isPreviewClearing = previewClearingCells.has(key);
            const isSpecial = cell ? SPECIAL_COLORS.has(cell) : false;
            const isPlaced =
              (theme.tileStyle === "jelly" ||
                theme.tileStyle === "minecraft") &&
              Boolean(
                cell &&
                  feedback?.placed.some(
                    (placed) =>
                      placed.row === rowIndex && placed.col === colIndex,
                  ),
              );
            const previewClass =
              isPreview && selectedPiece ? colorClass[selectedPiece.color] : "";

            return (
              <button
                aria-label={`${rowIndex + 1} row ${colIndex + 1} column`}
                className={`board-cell ${cell ? colorClass[cell] : previewClass} ${isPreview ? "preview" : ""} ${isPreviewClearing ? "preview-clearing" : ""} ${isClearing ? "clearing" : ""} ${isSpecial ? "special" : ""}`}
                key={key}
                data-cell-key={key}
                data-filled={Boolean(cell || (isPreview && selectedPiece))}
                style={getThemeTileStyle(
                  theme,
                  cell ?? (isPreview ? selectedPiece?.color : undefined),
                )}
                onClick={() => onCellClick(rowIndex, colIndex)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch")
                    onCellEnter({ row: rowIndex, col: colIndex });
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== "touch") onCellLeave();
                }}
                onFocus={() => onCellEnter({ row: rowIndex, col: colIndex })}
                onBlur={onCellLeave}
                type="button"
              >
                {theme.tileStyle === "cat" && (
                  <CatTile
                    filled={Boolean(cell || (isPreview && selectedPiece))}
                    joined={getCatConnections(
                      cell
                        ? isClearing
                          ? isCatFilled
                          : isCatRemaining
                        : (r, c) =>
                            Boolean(
                              selectedPiece && previewCells.has(`${r}-${c}`),
                            ),
                      rowIndex,
                      colIndex,
                    )}
                  />
                )}
                {theme.tileStyle === "jelly" &&
                  (cell || (isPreview && selectedPiece)) && (
                    <span
                      key={isPlaced ? feedback?.id : "rest"}
                      className={`jelly-tile-face ${isPlaced ? "jelly-tile-reveal" : ""}`}
                      style={
                        isPlaced
                          ? { animationDuration: `${JELLY_LANDING_MS}ms` }
                          : undefined
                      }
                      aria-hidden="true"
                    />
                  )}
                {theme.tileStyle === "minecraft" &&
                  (cell || (isPreview && selectedPiece)) && (
                    <MinecraftTile
                      key={isPlaced ? feedback?.id : "rest"}
                      color={cell ?? selectedPiece!.color}
                      className={isPlaced ? "mc-tile-place" : ""}
                    />
                  )}
              </button>
            );
          }),
        )}
        {theme.effects === "cat" && (
          <CatBoardEffects feedback={feedback} board={board} />
        )}
        {theme.effects === "pixel" && <BoardEffects feedback={feedback} />}
        {theme.tileStyle === "cat" && (
          <CatDecorations cells={catCells} rows={8} cols={8} />
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
