import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Board } from "../components/game";
import { PieceShape } from "../components/piece";
import { ThemeScope } from "../components/theme";
import { CLEAR_HIGHLIGHT_MS } from "../constants/config";
import { EMPTY_BOARD, PIECES, SIZE } from "../mocks/gameData";
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
import type { Board as BoardState, PlacementPosition } from "../types";
import { cloneBoard } from "../utils/boardUtils";
import { blockName, createPieceInstance } from "../utils/pieceUtils";
import { canPlace, getPlacementPreview, placePiece } from "../utils/placement";
import "../styles/PracticeScreen.css";

const THEMES = [
  CLASSIC_THEME,
  NEON_THEME,
  JELLY_THEME,
  MINECRAFT_THEME,
  CAT_THEME,
];
const BLOCKS = PIECES.filter((piece) => !piece.special);
const SINGLE = BLOCKS.find((piece) => piece.id === "monomino-single")!;
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
  const [piece, setPiece] = useState(() =>
    createPieceInstance({ ...SINGLE, color: "cyan" }),
  );
  const [hover, setHover] = useState<PlacementPosition | null>(null);
  const [clearing, setClearing] = useState(NO_CELLS);
  const [effect, setEffect] = useState<PracticeEffect | null>(null);
  const [notice, setNotice] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackId = useRef(0);
  const audio = useThemeAudio(themeId, audioReady);
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

  const preview = useMemo(() => {
    if (
      !hover ||
      clearing.size ||
      !canPlace(board, piece, hover.row, hover.col)
    )
      return null;
    return getPlacementPreview(board, piece, hover.row, hover.col);
  }, [board, clearing, hover, piece]);

  function resetBoard(prepareLine: boolean) {
    if (clearTimer.current !== null) clearTimeout(clearTimer.current);
    clearTimer.current = null;
    const next = cloneBoard(EMPTY_BOARD);
    if (prepareLine) {
      next[SIZE - 1].fill("cyan", 0, SIZE - 1);
      setPiece(createPieceInstance({ ...SINGLE, color: "violet" }));
    }
    setBoard(next);
    setClearing(NO_CELLS);
    setEffect(null);
    setHover(null);
    setNotice(prepareLine ? "맨 아래 줄의 빈칸에 블록을 놓아보세요." : "");
  }

  function place(row: number, col: number) {
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
    setHover(null);
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

  return (
    <ThemeScope themeId={themeId}>
      <main
        className="app-shell play-shell has-cell-mode practice-shell"
        data-game-theme={themeId}
      >
        <section
          className="practice-stage"
          aria-labelledby="practice-title"
          inert={!showRoom}
        >
          <header className="practice-header">
            <button
              className="secondary-action"
              type="button"
              onClick={onClose}
            >
              <ArrowLeft size={18} aria-hidden="true" /> 메인으로
            </button>
            <h1 id="practice-title">숨겨진 연습실</h1>
          </header>
          <div className="practice-controls">
            <label>
              <span id="practice-theme-label">테마</span>
              <select
                aria-labelledby="practice-theme-label"
                value={themeId}
                onChange={(event) => {
                  setEffect(null);
                  setThemeId(
                    THEMES.find(({ id }) => id === event.target.value)?.id ??
                      CLASSIC_THEME.id,
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
            <label>
              <span id="practice-block-label">블록</span>
              <select
                aria-labelledby="practice-block-label"
                value={piece.id}
                onChange={(event) => {
                  const next = BLOCKS.find(
                    ({ id }) => id === event.target.value,
                  );
                  if (next) setPiece(createPieceInstance(next));
                }}
              >
                {BLOCKS.map((block) => (
                  <option key={block.id} value={block.id}>
                    {blockName(block)}
                  </option>
                ))}
              </select>
            </label>
            <div className="practice-piece" aria-hidden="true">
              <PieceShape piece={piece} cellSize={15} cellGap={2} />
            </div>
          </div>
          <Board
            board={board}
            boardRef={boardRef}
            feedback={effect?.boardFeedback}
            clearingCells={clearing}
            hoverCell={hover}
            selectedPiece={piece}
            onCellClick={place}
            onCellEnter={setHover}
            onCellLeave={() => setHover(null)}
            previewCells={preview?.cells ?? NO_CELLS}
            previewClearingCells={preview?.clearingCells ?? NO_CELLS}
          />
          <p className="placement-hint" role="status">
            {notice || "보드에서 블록을 놓을 칸을 누르세요."}
          </p>
          <div className="practice-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => resetBoard(false)}
            >
              보드 비우기
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={() => resetBoard(true)}
            >
              한 줄 채우기
            </button>
          </div>
        </section>
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
