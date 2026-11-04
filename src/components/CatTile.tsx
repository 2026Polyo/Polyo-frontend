import "../styles/CatTheme.css";
import {
  getCatCoatStyle,
  getSpecialAppearance,
} from "../features/themes/specialAppearance";
import type { CSSProperties } from "react";

/** Keep mounted on empty board cells so filling, joining and reopening edges can transition. */
export default function CatTile({
  joined = "",
  filled = true,
  color,
  row = 0,
  col = 0,
}: {
  joined?: string;
  filled?: boolean;
  color?: string | null;
  row?: number;
  col?: number;
}) {
  return (
    <span
      className="cat-tile-face"
      data-joined={joined}
      data-filled={filled}
      data-special={getSpecialAppearance(color)}
      style={
        {
          ...getCatCoatStyle(color),
          "--cat-pattern-row": row,
          "--cat-pattern-col": col,
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}
