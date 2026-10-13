import "../styles/BlockRewardModal.css";
import PieceShape from "./PieceShape";
import { SPECIAL_LABELS } from "../features/specials";
import type { PieceInstance } from "../types";

interface BlockRewardModalProps {
  piece: PieceInstance | null;
  onConfirm: () => void;
}

function BlockRewardModal({ piece, onConfirm }: BlockRewardModalProps) {
  if (!piece) return null;

  const name = piece.special ? SPECIAL_LABELS[piece.special] : "새 블록";

  return (
    <div className="block-reward-backdrop" role="dialog" aria-modal="true" aria-labelledby="block-reward-title">
      <section className="block-reward-panel">
        <div className="block-reward-heading">
          <span>New Block</span>
          <strong id="block-reward-title">새로운 블록 획득!</strong>
        </div>
        <div className="block-reward-sprite">
          <PieceShape cellSize={34} cellGap={4} piece={piece} />
        </div>
        <p className="block-reward-text">
          <strong>{name}</strong>을(를) 덱에 추가했습니다.
        </p>
        <button className="block-reward-confirm" onClick={onConfirm} type="button">
          확인
        </button>
      </section>
    </div>
  );
}

export default BlockRewardModal;
