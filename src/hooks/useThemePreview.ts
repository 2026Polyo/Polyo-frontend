import { useEffect, useState } from "react";
import type { GameThemeId } from "../features/themes/gameThemes";
import {
  clearPreviewTheme,
  loadPreviewSelection,
  savePreviewTheme,
  THEME_PREVIEW_STORAGE_KEY,
} from "../features/themes/themePreview";

export function useThemePreview() {
  const [previewThemeId, setThemeId] = useState(loadPreviewSelection);

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === THEME_PREVIEW_STORAGE_KEY || event.key === null)
        setThemeId(loadPreviewSelection());
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  function selectTheme(themeId: GameThemeId) {
    setThemeId(themeId);
    savePreviewTheme(themeId);
  }

  function clearPreview() {
    setThemeId(null);
    clearPreviewTheme();
  }

  return { previewThemeId, selectTheme, clearPreview };
}
