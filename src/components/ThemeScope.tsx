import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { CLASSIC_THEME, getGameTheme } from "../features/themes/gameThemes";
import "../styles/NeonTheme.css";
import "../styles/JellyTheme.css";
import "../styles/MinecraftTheme.css";
import "../styles/CatTheme.css";
import { preloadMinecraftTextures } from "../features/themes/minecraftMaterials";

const GameThemeContext = createContext(CLASSIC_THEME);

export function ThemeScope({
  themeId,
  children,
}: {
  themeId: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (themeId === "theme_minecraft") preloadMinecraftTextures();
  }, [themeId]);
  return (
    <GameThemeContext.Provider value={getGameTheme(themeId)}>
      {children}
    </GameThemeContext.Provider>
  );
}

/** 가까운 플레이어의 테마만 읽는다. 전역 CSS나 상대의 선택을 변경하지 않는다. */
export function useGameTheme() {
  return useContext(GameThemeContext);
}
