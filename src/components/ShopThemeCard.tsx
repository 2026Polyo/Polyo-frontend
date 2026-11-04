import { Coins } from "lucide-react";
import type { MouseEvent } from "react";
import type { ShopTheme } from "../features/shop";
import { getThemePresentation } from "../features/themePresentation";
import ThemePreview from "./ThemePreview";

interface ShopThemeCardProps {
  theme: ShopTheme;
  onPreview: (theme: ShopTheme, trigger: HTMLButtonElement) => void;
}

export default function ShopThemeCard({
  theme,
  onPreview,
}: ShopThemeCardProps) {
  const { description } = getThemePresentation(theme.themeId);

  function openPreview(event: MouseEvent<HTMLButtonElement>) {
    onPreview(theme, event.currentTarget);
  }

  return (
    <article className="shop-card">
      <button
        className="shop-card-preview"
        type="button"
        aria-label={`${theme.name} 미리보기`}
        onClick={openPreview}
      >
        <ThemePreview themeId={theme.themeId} />
        <span>미리보기 ↗</span>
      </button>
      <div className="shop-card-body">
        <span className="shop-category">BLOCK THEME</span>
        <h3>{theme.name}</h3>
        <p>{description}</p>
        <div className="shop-card-footer">
          <strong>
            <Coins size={17} /> {theme.price.toLocaleString("ko-KR")} 코인
          </strong>
          <button type="button" onClick={openPreview}>
            자세히 보기
          </button>
        </div>
      </div>
    </article>
  );
}
