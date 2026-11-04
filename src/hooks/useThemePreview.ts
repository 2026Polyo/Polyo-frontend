import { useEffect, useState } from "react";
import type { GameThemeId } from "../features/themes/gameThemes";
import {
  loadPreviewTheme,
  savePreviewTheme,
  THEME_PREVIEW_STORAGE_KEY,
} from "../features/themes/themePreview";

export function useThemePreview() {
  const [themeId, setThemeId] = useState(loadPreviewTheme);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === THEME_PREVIEW_STORAGE_KEY || event.key === null)
        setThemeId(loadPreviewTheme());
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  function selectTheme(themeId: GameThemeId) {
    setThemeId(themeId);
    savePreviewTheme(themeId);
  }

  return { themeId, selectTheme };
}
