import { useEffect, useRef } from "react";
import { Coins, X } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { ShopTheme } from "../features/shop";
import { getThemePresentation } from "../features/themePresentation";
import { getGameTheme, type GameThemeId } from "../features/themes/gameThemes";
import ThemePreview from "./ThemePreview";
import type { ShopAccountState } from "../hooks/useShopAccount";

interface ShopThemeDialogProps {
  theme: ShopTheme | null;
  wallet: ShopAccountState;
  onClose: () => void;
  onDevPreview?: (themeId: GameThemeId) => void;
}

export default function ShopThemeDialog({
  theme,
  wallet,
  onClose,
  onDevPreview,
}: ShopThemeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backquoteHeld = useRef(false);
  const description = theme && getThemePresentation(theme.themeId).description;
  const owned = !!theme && wallet.account?.ownedThemeIds.includes(theme.themeId);
  const equipped = !!theme && wallet.account?.equippedThemeId === theme.themeId;
  const insufficient = !!theme && !!wallet.account && wallet.account.coin < theme.price;

  useEffect(() => {
    if (theme && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [theme]);

  useEffect(() => {
    if (!import.meta.env.DEV || !theme) return;

    function resetShortcut() {
      backquoteHeld.current = false;
    }

    function releaseKey(event: globalThis.KeyboardEvent) {
      if (event.code === "Backquote" || !event.ctrlKey) resetShortcut();
    }

    window.addEventListener("keyup", releaseKey);
    window.addEventListener("blur", resetShortcut);
    return () => {
      window.removeEventListener("keyup", releaseKey);
      window.removeEventListener("blur", resetShortcut);
      resetShortcut();
    };
  }, [theme]);

  function handleDevPreviewKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (!import.meta.env.DEV || !theme || !onDevPreview || !event.ctrlKey || event.altKey || event.metaKey
      || event.shiftKey || event.repeat || event.nativeEvent.isComposing) return;
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;

    if (event.code === "Backquote") {
      backquoteHeld.current = true;
      event.preventDefault();
      return;
    }
    if (event.code !== "KeyP" || !backquoteHeld.current) return;

    event.preventDefault();
    const previewTheme = getGameTheme(theme.themeId);
    if (previewTheme.id === theme.themeId) onDevPreview(previewTheme.id);
  }

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
      onKeyDown={import.meta.env.DEV && onDevPreview ? handleDevPreviewKey : undefined}
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
            {description && <p>{description}</p>}
            <strong className="shop-detail-price">
              <Coins size={21} /> {theme.price.toLocaleString("ko-KR")} 코인
            </strong>
            {owned ? (
              <button className="shop-purchase" type="button" disabled={equipped || wallet.pending}
                onClick={() => void wallet.equip(theme.themeId)}>
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
