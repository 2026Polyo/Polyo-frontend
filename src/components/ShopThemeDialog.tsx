import { useEffect, useRef } from "react";
import { Coins, X } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { ShopTheme } from "../features/shop";
import { getThemePresentation } from "../features/themePresentation";
import ThemePreview from "./ThemePreview";
import { getGameTheme, type GameThemeId } from "../features/themes/gameThemes";
import type { ShopAccountState } from "../hooks/useShopAccount";

interface ShopThemeDialogProps {
  theme: ShopTheme | null;
  wallet: ShopAccountState;
  onClose: () => void;
  onSelectPreviewTheme: (themeId: GameThemeId) => void;
  onEquipTheme: (themeId: string) => void;
}

export default function ShopThemeDialog({
  theme,
  wallet,
  onClose,
  onSelectPreviewTheme,
  onEquipTheme,
}: ShopThemeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewTheme = theme ? getGameTheme(theme.themeId) : null;
  const canPreview = previewTheme !== null && previewTheme.id === theme?.themeId;
  const owned = !!theme && wallet.account?.ownedThemeIds.includes(theme.themeId);
  const equipped = !!theme && wallet.account?.equippedThemeId === theme.themeId;
  const insufficient = !!theme && !!wallet.account && wallet.account.coin < theme.price;

  useEffect(() => {
    if (theme && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [theme]);

  function closeDialog() {
    dialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDialog();
  }

  function selectPreview() {
    if (canPreview) onSelectPreviewTheme(previewTheme.id);
  }

  function onPreviewKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.code !== "KeyP" || event.repeat || event.nativeEvent.isComposing
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (!canPreview) return;
    event.preventDefault();
    selectPreview();
  }

  return (
    <dialog
      ref={dialogRef}
      className="shop-dialog"
      aria-labelledby="shop-detail-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
      onKeyDown={onPreviewKey}
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
              disabled={!canPreview}
              aria-keyshortcuts="P"
              onClick={selectPreview}
            >
              게임 미리보기 <kbd>P</kbd>
            </button>
            {owned ? (
              <button className="shop-purchase" type="button" disabled={equipped || wallet.pending}
                onClick={() => onEquipTheme(theme.themeId)}>
                {equipped ? "장착 중" : "보유 테마 장착"}
              </button>
            ) : (
              <button className="shop-purchase" type="button" disabled={wallet.pending || !wallet.account || insufficient}
                onClick={() => void wallet.purchase(theme.themeId)}>
                {wallet.pending ? "확인 중…" : insufficient ? "코인 부족" : "구매하기"}
              </button>
            )}
            {wallet.error && (
              <div role="alert">
                <small>{wallet.error}</small>
                <button type="button" className="secondary-action" onClick={() => void wallet.refresh()}>보유 정보 다시 조회</button>
              </div>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
