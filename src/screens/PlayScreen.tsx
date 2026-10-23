import { Layers, Undo2 } from "lucide-react";
import BlockRewardModal from "../components/BlockRewardModal";
import Board from "../components/Board";
import DeckModal from "../components/DeckModal";
import GameSettingsMenu from "../components/GameSettingsMenu";
import GameOver from "../components/GameOver";
import PieceShape from "../components/PieceShape";
import PieceTray from "../components/PieceTray";
import RerollModal from "../components/RerollModal";
import ScoreBoard from "../components/ScoreBoard";
import SpecialChoiceModal from "../components/SpecialChoiceModal";
import { AugmentChoiceModal } from "../components/AugmentChoiceModal";
import { AugmentPanel } from "../components/AugmentPanel";
import { ItemSlots as ItemSlotsView } from "../components/ItemSlots";
import type {
  BonusTimeState,
  GameMode,
  AugmentId,
  AugmentState,
  Board as BoardType,
  BoardMetrics,
  ItemSlots,
  ItemType,
  PieceInstance,
  PieceTemplate,
  PlacementPosition,
  PointerPoint,
  AnchorOffset,
  Tray,
  UndoSnapshot
} from "../types";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { UsePieceSelectionResult } from "../hooks/usePieceSelection";

interface PlayScreenProps {
  bonusTime: BonusTimeState;
  gameMode: GameMode;
  augmentState: AugmentState;
  autoUndoFlash: boolean;
  best: number;
  board: {
    board: BoardType;
    boardMetrics: BoardMetrics;
    boardRef: RefObject<HTMLDivElement | null>;
    clearLabel: string | null;
    clearLabelId: number;
    clearingCells: Set<string>;
    cursorAnchorOffset: AnchorOffset | null;
    cursorPiece: PieceInstance | null;
    cursorPoint: PointerPoint | null;
    handleCellClick: (row: number, col: number) => void;
    hoverCell: PlacementPosition | null;
    invalidPreview: boolean;
    previewCells: Set<string>;
    previewClearingCells: Set<string>;
    selectedPiece: PieceInstance | null;
    setHoverCell: Dispatch<SetStateAction<PlacementPosition | null>>;
  };
  comboEffectValue: number | null;
  gameOver: boolean;
  gravityAnimating: boolean;
  handleItemClick: (item: ItemType | null, index: number) => void;
  isClearing: boolean;
  itemSlots: ItemSlots;
  onOpenDeckModal: () => void;
  previewGain: number | null;
  score: number;
  modals: {
    augmentChoiceOpen: boolean;
    deckModalOpen: boolean;
    deckPieces: PieceTemplate[];
    rerollPieces: PieceTemplate[];
    handleAugmentChoose: (augmentId: AugmentId) => void;
    handleSpecialChoose: (template: PieceTemplate) => void;
    onCloseDeckModal: () => void;
    onConfirmReward: () => void;
    onGameOverGoHome: () => void;
    onGameOverRestart: () => void;
    rewardPiece: PieceInstance | null;
    rerollLevel: number;
    rerollModalSlot: number | null;
    specialChoices: PieceTemplate[] | null;
    applyReroll: (tray: Tray) => void;
    cancelReroll: () => void;
  };
  settings: {
    open: boolean;
    onClose: () => void;
    onGoHome: () => void;
    onQuit: () => void;
    onToggle: () => void;
  };
  tray: {
    clearSelection: () => void;
    handlePieceSelect: UsePieceSelectionResult["handlePieceSelect"];
    handlePieceActivate: UsePieceSelectionResult["handlePieceActivate"];
    pieces: Tray;
    selectedPiece: PieceInstance | null;
  };
  undoSnapshot: UndoSnapshot | null;
}

function PlayScreen({
  bonusTime,
  gameMode,
  augmentState,
  autoUndoFlash,
  best,
  board,
  comboEffectValue,
  gameOver,
  gravityAnimating,
  handleItemClick,
  isClearing,
  itemSlots,
  onOpenDeckModal,
  previewGain,
  score,
  modals,
  settings,
  tray,
  undoSnapshot
}: PlayScreenProps) {
  const selectedPiece = board.selectedPiece;

  return (
    <main className={`app-shell play-shell ${board.cursorPoint ? "has-cursor-piece" : ""}`}>
      <GameSettingsMenu
        open={settings.open}
        onClose={settings.onClose}
        onGoHome={settings.onGoHome}
        onQuit={settings.onQuit}
        onToggle={settings.onToggle}
      />
      <section className="game-area">
        <ScoreBoard best={best} score={score} previewGain={previewGain} />
        <div className={`bonus-status ${bonusTime.remainingMs > 0 ? "is-active" : ""}`}>
          <span>{gameMode === "hard" ? "하드모드" : "일반모드"}</span>
          {gameMode === "normal" && (bonusTime.remainingMs > 0 ? (
            <><strong role="status">보너스 타임 · 한 칸 블록!</strong><span role="timer" aria-label="보너스 남은 시간">{(bonusTime.remainingMs / 1000).toFixed(1)}초</span></>
          ) : <span>보너스까지 {bonusTime.placements} / 60</span>)}
        </div>
        <div className="board-layout">
          <AugmentPanel augmentState={augmentState} />
          <div className="board-stack">
            <div className="board-combo-stage">
              <Board
                board={board.board}
                boardRef={board.boardRef}
                hoverCell={board.hoverCell}
                clearingCells={board.clearingCells}
                onCellClick={board.handleCellClick}
                onCellEnter={board.setHoverCell}
                onCellLeave={() => board.setHoverCell(null)}
                previewClearingCells={board.previewClearingCells}
                previewCells={board.previewCells}
                selectedPiece={selectedPiece}
              />
              {comboEffectValue !== null && (
                <div className="combo-burst" aria-live="polite">
                  combo {comboEffectValue}
                </div>
              )}
              {board.clearLabel && (
                <div key={board.clearLabelId} className="clear-burst" aria-live="polite">
                  {board.clearLabel}
                </div>
              )}
            </div>
            <PieceTray
              disabled={modals.augmentChoiceOpen || Boolean(modals.specialChoices) || Boolean(modals.rewardPiece) || settings.open || modals.deckModalOpen || modals.rerollModalSlot !== null || gameOver || isClearing || gravityAnimating}
              onEmptySlotClick={tray.clearSelection}
              onPieceSelect={tray.handlePieceSelect}
              onPieceActivate={tray.handlePieceActivate}
              selectedId={tray.selectedPiece?.uid ?? null}
              tray={tray.pieces}
            />
            <p className="placement-hint" aria-live="polite">
              {selectedPiece ? "놓을 칸을 누르세요 · 블록을 다시 누르면 선택 취소" : "블록을 끌어 놓거나, 블록과 놓을 칸을 차례로 누르세요"}
            </p>
          </div>
          <ItemSlotsView
            isClearing={isClearing || gravityAnimating}
            itemSlots={itemSlots}
            onItemClick={handleItemClick}
            undoSnapshot={undoSnapshot}
          />
          <button
            aria-label="현재 덱 보기"
            className="deck-view-button"
            onClick={onOpenDeckModal}
            type="button"
          >
            <Layers size={22} aria-hidden="true" />
            <span>덱</span>
          </button>
        </div>
        {board.cursorPiece && board.cursorPoint && board.cursorAnchorOffset && (
          <div
            className={`cursor-piece ${board.invalidPreview ? "invalid" : ""}`}
            style={{
              left: board.cursorPoint.x,
              top: board.cursorPoint.y,
              transform: `translate(-${board.cursorAnchorOffset.x}px, -${board.cursorAnchorOffset.y}px)`
            }}
          >
            <PieceShape
              cellGap={board.boardMetrics.cellGap}
              cellSize={board.boardMetrics.cellSize}
              className="cursor-piece-grid"
              piece={board.cursorPiece}
            />
          </div>
        )}
      </section>
      {modals.augmentChoiceOpen && (
        <AugmentChoiceModal augmentState={augmentState} onChoose={modals.handleAugmentChoose} score={score} />
      )}
      {modals.specialChoices && (
        <SpecialChoiceModal choices={modals.specialChoices} onChoose={modals.handleSpecialChoose} />
      )}
      {modals.rewardPiece && <BlockRewardModal onConfirm={modals.onConfirmReward} piece={modals.rewardPiece} />}
      {modals.deckModalOpen && (
        <DeckModal deckPieces={modals.deckPieces as PieceInstance[]} onClose={modals.onCloseDeckModal} />
      )}
      {modals.rerollModalSlot !== null && (
        <RerollModal
          board={board.board}
          deckPieces={modals.rerollPieces}
          level={modals.rerollLevel}
          onApply={modals.applyReroll}
          onCancel={modals.cancelReroll}
          tray={tray.pieces}
        />
      )}
      {gameOver && (
        <GameOver
          best={best}
          onGoHome={modals.onGameOverGoHome}
          onRestart={modals.onGameOverRestart}
          score={score}
        />
      )}
      {autoUndoFlash && (
        <div className="auto-undo-flash" role="status" aria-live="assertive">
          <div className="auto-undo-flash-card">
            <Undo2 className="auto-undo-flash-icon" size={64} aria-hidden="true" />
            <span className="auto-undo-flash-text">되돌리기 자동 사용!</span>
          </div>
        </div>
      )}
    </main>
  );
}

export default PlayScreen;
