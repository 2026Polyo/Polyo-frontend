import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Board } from "../components/game";
import { PieceShape } from "../components/piece";
import PracticeBlockPalette from "../components/piece/PracticeBlockPalette";
import { ThemeScope } from "../components/theme";
import { CLEAR_HIGHLIGHT_MS, MAX_SNAP_DISTANCE } from "../constants/config";
import { EMPTY_BOARD, PIECES } from "../mocks/gameData";
import { createBoardFeedback, type BoardFeedback } from "../features/themes";
import {
  CAT_THEME,
  CLASSIC_THEME,
  JELLY_THEME,
  MINECRAFT_THEME,
  NEON_THEME,
  type GameThemeId,
} from "../features/themes";
import { useThemeAudio } from "../hooks/useThemeAudio";
import type { Board as BoardState, PieceInstance } from "../types";
import { cloneBoard } from "../utils/boardUtils";
import { createPieceInstance } from "../utils/pieceUtils";
import {
  canPlace,
  getClosestPlacement,
  getPlacementDistanceSquared,
  placePiece,
} from "../utils/placement";
import { usePieceSelection } from "../hooks/usePieceSelection";
import "../styles/PracticeScreen.css";
import {
  PracticeCursorLayer,
  PracticeHeader,
  PracticeStage,
} from "../styles/PracticeScreen.styles";

const THEMES = [
  CLASSIC_THEME,
  NEON_THEME,
  JELLY_THEME,
  MINECRAFT_THEME,
  CAT_THEME,
];
const BLOCKS = PIECES.filter((piece) => !piece.special);
const NO_CELLS = new Set<string>();
const PAPER_COLORS = ["#ffcf40", "#a368f8", "#97de2e", "#f34a91", "#2dd2f5"];

type PracticeEffect = { boardFeedback: BoardFeedback; lines: number };

function PracticeDiscovery({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <aside className="practice-discovery" role="status">
        <span className="practice-discovery-icon">
          <Trophy size={23} aria-hidden="true" />
        </span>
        <span>
          <small>업적 달성</small>
          <strong>숨겨진 연습실을 발견했어요!</strong>
        </span>
      </aside>
      {!reducedMotion && (
        <div className="practice-confetti" aria-hidden="true">
          {[-1, 1].map((side) => (
            <div
              className={`practice-confetti-source ${side === 1 ? "is-left" : "is-right"}`}
              key={side}
            >
              {Array.from({ length: 34 }, (_, index) => (
                <i
                  key={index}
                  style={
                    {
                      backgroundColor:
                        PAPER_COLORS[index % PAPER_COLORS.length],
                      "--paper-x": side * (8 + ((index * 13) % 45)),
                      "--paper-rise": 21 + ((index * 17) % 45),
                      "--paper-spin": `${side * (270 + ((index * 47) % 540))}deg`,
                      "--paper-width": `${6 + ((index * 3) % 8)}px`,
                      animationDelay: `${(index % 6) * 26}ms`,
                      animationDuration: `${1550 + ((index * 73) % 600)}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function PracticeScreen({
  initialTheme,
  firstVisit,
  onClose,
}: {
  initialTheme: GameThemeId;
  firstVisit: boolean;
  onClose: () => void;
}) {
  const [themeId, setThemeId] = useState(initialTheme);
  const reducedMotion = useReducedMotion();
  const [showRoom, setShowRoom] = useState(reducedMotion);
  const [board, setBoard] = useState<BoardState>(() => cloneBoard(EMPTY_BOARD));
  const pieces = useMemo(() => BLOCKS.map(createPieceInstance), []);
  const [clearing, setClearing] = useState(NO_CELLS);
  const [effect, setEffect] = useState<PracticeEffect | null>(null);
  const [notice, setNotice] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackId = useRef(0);
  const audio = useThemeAudio(themeId, audioReady);
  const selection = usePieceSelection({
    augmentChoiceOpen: false,
    availablePieces: pieces,
    board,
    isPlaying: showRoom && clearing.size === 0,
    onPlace: place,
    clearSelectionOnDrop: true,
  });
  const { boardRef, handlePieceActivate, selectedPiece } = selection;
  const activatePiece = useCallback(
    (piece: PieceInstance) => {
      handlePieceActivate(piece);
      if (piece.uid !== selectedPiece?.uid)
        boardRef.current
          ?.querySelector<HTMLButtonElement>(".board-cell")
          ?.focus();
    },
    [handlePieceActivate, selectedPiece, boardRef],
  );
  useEffect(() => {
    if (!selectedPiece) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        selection.clearSelection();
      }
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [selectedPiece, selection.clearSelection]);
  const playEffect = useEffectEvent(
    ({ boardFeedback, lines }: PracticeEffect) => {
      audio.playPlacement(boardFeedback.placed[0]?.color);
      if (lines)
        audio.playClearFeedback(
          lines,
          boardFeedback.cleared.length,
          boardFeedback.cleared,
        );
    },
  );

  useEffect(() => {
    if (effect) playEffect(effect);
  }, [effect]);
  useEffect(
    () => () => {
      if (clearTimer.current !== null) clearTimeout(clearTimer.current);
    },
    [],
  );

  function resetBoard() {
    if (clearTimer.current !== null) clearTimeout(clearTimer.current);
    clearTimer.current = null;
    selection.clearSelection();
    setBoard(cloneBoard(EMPTY_BOARD));
    setClearing(NO_CELLS);
    setEffect(null);
    setNotice("");
  }

  function place(piece: PieceInstance, row: number, col: number) {
    if (clearTimer.current !== null) return;
    if (!canPlace(board, piece, row, col)) {
      setNotice("이 칸에는 블록을 놓을 수 없어요.");
      return;
    }
    audio.resume();
    setAudioReady(true);
    const result = placePiece(board, piece, row, col);
    const cells = new Set(result.clearedCells);
    setEffect({
      boardFeedback: createBoardFeedback(
        ++feedbackId.current,
        piece,
        row,
        col,
        result.placedBoard,
        cells,
        result.cleared,
      ),
      lines: result.cleared,
    });
    setNotice("");
    selection.clearSelection();
    if (!cells.size) {
      setBoard(result.board);
      return;
    }
    setBoard(result.placedBoard);
    setClearing(cells);
    clearTimer.current = setTimeout(() => {
      clearTimer.current = null;
      setBoard(result.board);
      setClearing(NO_CELLS);
    }, CLEAR_HIGHLIGHT_MS);
  }

  function placeSelected(row: number, col: number) {
    if (!selectedPiece || clearTimer.current !== null) return;
    const target = {
      row: row - (selection.anchorCell?.[0] ?? 0),
      col: col - (selection.anchorCell?.[1] ?? 0),
    };
    const closest = getClosestPlacement(board, selectedPiece, target);
    if (
      !closest ||
      getPlacementDistanceSquared(target, closest) > MAX_SNAP_DISTANCE ** 2
    ) {
      setNotice("이 칸에는 블록을 놓을 수 없어요.");
      return;
    }
    place(selectedPiece, closest.row, closest.col);
  }

  return (
    <ThemeScope themeId={themeId}>
      <main
        className={`app-shell play-shell has-cell-mode practice-shell ${selection.cursorPiece ? "has-cursor-piece" : ""}`}
        data-game-theme={themeId}
      >
        <PracticeStage
          className="practice-stage"
          aria-labelledby="practice-title"
          inert={!showRoom}
        >
          <div className="practice-workspace">
            <div className="practice-board-column">
              <PracticeHeader className="practice-header">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={onClose}
                >
                  <ArrowLeft size={18} aria-hidden="true" /> 메인으로
                </button>
                <h1 id="practice-title">숨겨진 연습실</h1>
              </PracticeHeader>
              <div className="practice-controls">
                <label>
                  <span id="practice-theme-label">테마</span>
                  <select
                    aria-labelledby="practice-theme-label"
                    value={themeId}
                    onChange={(event) => {
                      selection.clearSelection();
                      setEffect(null);
                      setNotice("");
                      setThemeId(
                        THEMES.find(({ id }) => id === event.target.value)
                          ?.id ?? CLASSIC_THEME.id,
                      );
                    }}
                  >
                    {THEMES.map(({ id, name }) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Board
                board={board}
                boardRef={boardRef}
                feedback={effect?.boardFeedback}
                clearingCells={clearing}
                hoverCell={selection.hoverCell}
                selectedPiece={selectedPiece}
                onCellClick={placeSelected}
                onCellEnter={selection.setHoverCell}
                onCellLeave={() => selection.setHoverCell(null)}
                previewCells={selection.previewCells}
                previewClearingCells={selection.previewClearingCells}
              />
              <p className="placement-hint" role="status">
                {notice ||
                  (selection.invalidPreview
                    ? "이곳에는 블록을 놓을 수 없어요."
                    : "목록의 블록을 보드로 드래그하세요.")}
              </p>
              <div className="practice-actions">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={resetBoard}
                >
                  보드 비우기
                </button>
              </div>
            </div>
            <PracticeBlockPalette
              pieces={pieces}
              selectedId={selectedPiece?.uid ?? null}
              disabled={!showRoom || clearing.size > 0}
              onPieceSelect={selection.handlePieceSelect}
              onPieceActivate={activatePiece}
            />
          </div>
        </PracticeStage>
        {selection.cursorPiece &&
          selection.cursorPoint &&
          selection.cursorAnchorOffset && (
            <PracticeCursorLayer aria-hidden="true">
              <div
                className={`cursor-piece ${selection.invalidPreview ? "invalid" : ""}`}
                style={{
                  left: selection.cursorPoint.x,
                  top: selection.cursorPoint.y,
                  transform: `translate(-${selection.cursorAnchorOffset.x}px, -${selection.cursorAnchorOffset.y}px)`,
                }}
              >
                <PieceShape
                  piece={selection.cursorPiece}
                  cellSize={selection.boardMetrics.cellSize}
                  cellGap={selection.boardMetrics.cellGap}
                  className="cursor-piece-grid"
                />
              </div>
            </PracticeCursorLayer>
          )}
        {!showRoom && (
          <div
            className="practice-transition practice-transition-in"
            aria-hidden="true"
            onAnimationEnd={() => setShowRoom(true)}
          />
        )}
        {firstVisit && showRoom && (
          <PracticeDiscovery reducedMotion={reducedMotion} />
        )}
      </main>
    </ThemeScope>
  );
}
