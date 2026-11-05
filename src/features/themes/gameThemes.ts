import spaceImage from "../../asset/theme/neon-space.jpg";
import type { CSSProperties } from "react";
import { MINECRAFT_MATERIALS } from "./minecraftMaterials";
import { colorClass } from "../../constants/gameData";
import type { ThemeSynthPreset } from "./themeSoundSynthesis";

export type GameThemeId =
  | "theme_classic"
  | "theme_neon"
  | "theme_jelly"
  | "theme_minecraft"
  | "theme_cat";
export type ThemeSoundEvent = "placement" | "clear";

export type ThemeSoundCue =
  | { kind: "file"; src: string; volume: number }
  | { kind: "synth"; preset: ThemeSynthPreset; volume: number; variants?: number }
  | { kind: "minecraft"; volume: number };

export interface GameTheme {
  id: GameThemeId;
  name: string;
  tileStyle: "classic" | "neon" | "jelly" | "minecraft" | "cat";
  palette: Readonly<Record<string, string>>;
  effects: "classic" | "pixel" | "jelly" | "minecraft" | "cat";
  soundMode: "legacy" | "custom" | "pending";
  sounds: Readonly<Record<ThemeSoundEvent, ThemeSoundCue | null>>;
  background: {
    src: string;
    // 원본의 주 피사체를 화면의 지정 지점에 고정한다. 모든 값은 백분율이다.
    focalPoint: { x: number; y: number };
    position: { x: number; y: number };
    height: number;
  } | null;
}

export const CLASSIC_THEME: GameTheme = {
  id: "theme_classic",
  name: "기본",
  tileStyle: "classic",
  palette: {},
  effects: "classic",
  soundMode: "legacy",
  sounds: { placement: null, clear: null },
  background: null,
};

export const NEON_THEME: GameTheme = {
  id: "theme_neon",
  name: "네온 나이트",
  tileStyle: "neon",
  palette: {
    cyan: "#32f4ff",
    lime: "#c2ff4a",
    amber: "#ffcf4a",
    rose: "#ff527e",
    violet: "#b580ff",
    blue: "#558bff",
    teal: "#32ffcf",
    orange: "#ff9257",
    pink: "#ff65e2",
    green: "#68ff87",
    indigo: "#8c8aff",
    ghost: "#e2f5ff",
    line: "#fff07c",
    echo: "#e47bff",
    golden: "#ffd340",
    bomb: "#ff6868",
    fill: "#50ffb0",
    boost: "#ff71e7",
  },
  effects: "pixel",
  soundMode: "custom",
  sounds: {
    placement: { kind: "synth", preset: "neon-placement", volume: 0.28 },
    clear: { kind: "synth", preset: "neon-clear", volume: 0.32 },
  },
  background: {
    src: spaceImage,
    focalPoint: { x: 67, y: 39.5 },
    position: { x: 42, y: 40 },
    height: 160,
  },
};

export const JELLY_THEME: GameTheme = {
  id: "theme_jelly",
  name: "젤리 팝",
  tileStyle: "jelly",
  palette: {
    cyan: "#43cce8",
    lime: "#a6d94e",
    amber: "#ffc14e",
    rose: "#f96e91",
    violet: "#af8cec",
    blue: "#6d9fef",
    teal: "#4bcdb6",
    orange: "#ff985a",
    pink: "#ed82bd",
    green: "#68ce87",
    indigo: "#8c87dc",
    ghost: "#c6dbf3",
    line: "#f4d866",
    echo: "#c884df",
    golden: "#eebc46",
    bomb: "#bb718c",
    fill: "#64d2b1",
    boost: "#ed83b3",
  },
  effects: "jelly",
  soundMode: "custom",
  sounds: {
    placement: { kind: "synth", preset: "jelly-placement", volume: 0.52, variants: 3 },
    clear: { kind: "synth", preset: "jelly-clear", volume: 0.48, variants: 2 },
  },
  background: null,
};

export const MINECRAFT_THEME: GameTheme = {
  id: "theme_minecraft",
  name: "마인크래프트",
  tileStyle: "minecraft",
  palette: Object.fromEntries(
    Object.entries(MINECRAFT_MATERIALS).map(([color, block]) => [
      color,
      block.color,
    ]),
  ),
  effects: "minecraft",
  soundMode: "custom",
  sounds: { placement: { kind: "minecraft", volume: 0.46 }, clear: { kind: "minecraft", volume: 0.4 } },
  background: null,
};

export const CAT_THEME: GameTheme = {
  id: "theme_cat",
  name: "고양이 드림",
  tileStyle: "cat",
  palette: Object.fromEntries(
    Object.keys(colorClass).map((color) => [color, "#ffffff"]),
  ),
  effects: "cat",
  soundMode: "custom",
  sounds: {
    placement: { kind: "synth", preset: "cat-placement", volume: 0.5, variants: 6 },
    clear: { kind: "synth", preset: "cat-clear", volume: 0.35, variants: 3 },
  },
  background: null,
};

/** 서버 ID와 외형 정의를 연결하는 접점. 미지원 ID는 기본 테마로 표시한다. */
export function getGameTheme(themeId?: string): GameTheme {
  if (themeId === NEON_THEME.id) return NEON_THEME;
  if (themeId === JELLY_THEME.id) return JELLY_THEME;
  if (themeId === MINECRAFT_THEME.id) return MINECRAFT_THEME;
  if (themeId === CAT_THEME.id) return CAT_THEME;
  return CLASSIC_THEME;
}

export function getThemeTileColor(theme: GameTheme, color: string): string {
  return Object.prototype.hasOwnProperty.call(theme.palette, color)
    ? theme.palette[color]
    : "#32f4ff";
}

export function getThemeTileStyle(
  theme: GameTheme,
  color?: string | null,
): CSSProperties | undefined {
  if (theme.tileStyle === "classic" || !color) return undefined;
  return {
    "--theme-tile-color": getThemeTileColor(theme, color),
  } as CSSProperties;
}

/** null은 아직 미제공인 음원이다. 임의의 기본 음원으로 대체하지 않는다. */
export function getThemeSound(
  themeId: string,
  event: ThemeSoundEvent,
): ThemeSoundCue | null {
  return getGameTheme(themeId).sounds[event];
}
