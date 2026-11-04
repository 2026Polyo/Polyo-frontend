import type { CSSProperties } from "react";
import type { GameTheme } from "../features/themes/gameThemes";
import "../styles/NeonTheme.css";

export default function ThemeFieldBackground({
  background,
}: {
  background: NonNullable<GameTheme["background"]>;
}) {
  return (
    <div
      className="theme-field-background"
      aria-hidden="true"
      style={
        {
          "--field-image-height": `${background.height}%`,
          "--field-image-focus-x": `${background.focalPoint.x}%`,
          "--field-image-focus-y": `${background.focalPoint.y}%`,
          "--field-image-position-x": `${background.position.x}%`,
          "--field-image-position-y": `${background.position.y}%`,
        } as CSSProperties
      }
    >
      <img
        className="theme-field-image"
        src={background.src}
        alt=""
        decoding="async"
        onError={(event) => {
          event.currentTarget.hidden = true;
        }}
      />
    </div>
  );
}
