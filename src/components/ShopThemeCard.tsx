import { Coins } from "lucide-react";
import type { MouseEvent } from "react";
import type { ShopTheme } from "../features/shop";
import { getThemePresentation } from "../features/themePresentation";
import ThemePreview from "./ThemePreview";

interface ShopThemeCardProps {
  theme: ShopTheme;
  onOpenDetails: (theme: ShopTheme, trigger: HTMLButtonElement) => void;
}

export default function ShopThemeCard({
  theme,
  onOpenDetails,
}: ShopThemeCardProps) {
  const { description } = getThemePresentation(theme.themeId);

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
        <span className="shop-category">BLOCK THEME</span>
        <h3>{theme.name}</h3>
        {description && <p>{description}</p>}
        <div className="shop-card-footer">
          <strong>
            <Coins size={17} /> {theme.price.toLocaleString("ko-KR")} 코인
          </strong>
          <button type="button" onClick={openDetails}>
            자세히 보기
          </button>
        </div>
      </div>
    </article>
  );
}
