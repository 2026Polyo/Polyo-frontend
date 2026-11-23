import { Coins } from "lucide-react";
import type { MouseEvent } from "react";
import type { ShopTheme } from "../../features/shop";
import { getThemePresentation } from "../../features/themePresentation";
import ThemePreview from "../ThemePreview";
import type { ShopAccountState } from "../../hooks/shop";

interface ShopThemeCardProps {
  theme: ShopTheme;
  wallet: ShopAccountState;
  onOpenDetails: (theme: ShopTheme, trigger: HTMLButtonElement) => void;
}

export default function ShopThemeCard({
  theme,
  wallet,
  onOpenDetails,
}: ShopThemeCardProps) {
  const { description } = getThemePresentation(theme.themeId);
  const equipped = wallet.account?.equippedThemeId === theme.themeId;
  const owned =
    equipped || wallet.account?.ownedThemeIds.includes(theme.themeId);

  function openDetails(event: MouseEvent<HTMLButtonElement>) {
    onOpenDetails(theme, event.currentTarget);
  }

  return (
    <article className="shop-card">
      <button
        className="shop-card-preview"
        type="button"
        aria-label={`${theme.name} 상세 보기`}
        onClick={openDetails}
      >
        <ThemePreview themeId={theme.themeId} />
      </button>
      <div className="shop-card-body">
        <div className="shop-card-heading">
          <h3>{theme.name}</h3>
          {wallet.account && (
            <span className="shop-ownership" data-owned={owned}>
              {owned ? "보유 중" : "미보유"}
            </span>
          )}
        </div>
        {description && <p>{description}</p>}
        <div className="shop-card-footer">
          {owned ? (
            <button
              className="shop-purchase"
              type="button"
              disabled={wallet.pending}
              aria-pressed={equipped}
              onClick={() =>
                void wallet.equip(equipped ? "theme_classic" : theme.themeId)
              }
            >
              {equipped ? "장착 완료" : "보유 테마 장착"}
            </button>
          ) : (
            <>
              <strong>
                <Coins size={17} /> {theme.price.toLocaleString("ko-KR")} 코인
              </strong>
              <button type="button" onClick={openDetails}>
                자세히 보기
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
