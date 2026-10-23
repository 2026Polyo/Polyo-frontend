import { getThemePresentation } from "../features/shop";

const CELLS = [0, 0, -1, -1, -1, -1, -1, -1, 0, 0, -1, -1, 3, -1, -1, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1, -1, -1, 3, 3, -1, -1, -1, 1, 1, 1, -1, -1, -1, -1, -1, -1, 2, 2, -1, 4, 4, -1];

export default function ThemePreview({ themeId }: { themeId: string }) {
  const { colors, glow } = getThemePresentation(themeId);
  return <div className={`shop-preview ${glow ? "shop-preview-neon" : ""}`} aria-hidden="true">
    <div className="shop-preview-board">{CELLS.map((cell, index) => <span key={index}
      className={cell >= 0 ? "shop-preview-filled" : ""}
      style={cell >= 0 ? { backgroundColor: colors[cell], color: colors[cell] } : undefined} />)}</div>
    <div className="shop-swatches">{colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</div>
  </div>;
}
