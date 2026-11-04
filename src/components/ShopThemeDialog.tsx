import { useEffect, useRef } from "react";
import { Coins, X } from "lucide-react";
import type { MouseEvent } from "react";
import type { ShopTheme } from "../features/shop";
import { getThemePresentation } from "../features/themePresentation";
import ThemePreview from "./ThemePreview";
import { getGameTheme, type GameThemeId } from "../features/themes/gameThemes";

interface ShopThemeDialogProps {
  theme: ShopTheme | null;
  onClose: () => void;
  onSelectPreviewTheme: (themeId: GameThemeId) => void;
}

export default function ShopThemeDialog({
  theme,
  onClose,
  onSelectPreviewTheme,
}: ShopThemeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (theme && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [theme]);

  function closeDialog() {
    dialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog();
  }

  return (
    <dialog
      ref={dialogRef}
      className="shop-dialog"
      aria-labelledby="shop-detail-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      {theme && (
        <>
          <button
            type="button"
            className="shop-dialog-close"
            aria-label="상세 닫기"
            onClick={closeDialog}
          >
            <X size={21} />
          </button>
          <ThemePreview themeId={theme.themeId} />
          <div className="shop-detail-body">
            <span className="shop-category">BLOCK THEME</span>
            <h2 id="shop-detail-title">{theme.name}</h2>
            <p>{getThemePresentation(theme.themeId).description}</p>
            <strong className="shop-detail-price">
              <Coins size={21} /> {theme.price.toLocaleString("ko-KR")} 코인
            </strong>
            <button
              className="secondary-action shop-preview-play"
              type="button"
              disabled={getGameTheme(theme.themeId).id !== theme.themeId}
              onClick={() =>
                onSelectPreviewTheme(getGameTheme(theme.themeId).id)
              }
            >
              {getGameTheme(theme.themeId).id === theme.themeId
                ? "게임 미리보기로 선택"
                : "게임 미리보기 준비 중"}
            </button>
            <button className="shop-purchase" type="button" disabled>
              서버 연동 후 구매 가능
            </button>
            <small>
              선택한 테마로 시작 화면의 새 게임·이어하기를 체험할 수 있어요.
              실제 구매와 보유 테마 장착은 아직 제공되지 않습니다.
            </small>
          </div>
        </>
      )}
    </dialog>
  );
}
