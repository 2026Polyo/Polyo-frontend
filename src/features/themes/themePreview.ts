import { getGameTheme, type GameThemeId } from "./gameThemes";

// 미리보기 선택만 저장한다. 보유 테마·장착 상태·게임 진행 데이터와 분리한다.
export const THEME_PREVIEW_STORAGE_KEY = "polyomino-preview-theme";

export function loadPreviewTheme(): GameThemeId {
  return loadPreviewSelection() ?? "theme_classic";
}

export function loadPreviewSelection(): GameThemeId | null {
  try {
    const id = localStorage.getItem(THEME_PREVIEW_STORAGE_KEY);
    if (id === null) return null;
    const theme = getGameTheme(id);
    return theme.id === id ? theme.id : null;
  } catch {
    return null;
  }
}

export function clearPreviewTheme(): void {
  try {
    localStorage.removeItem(THEME_PREVIEW_STORAGE_KEY);
  } catch {
    // The in-memory preview can still be cleared.
  }
}

export function savePreviewTheme(themeId: GameThemeId): void {
  try {
    localStorage.setItem(THEME_PREVIEW_STORAGE_KEY, themeId);
  } catch {
    // 저장소가 차단되어도 현재 화면에서는 선택한 테마로 플레이한다.
  }
}
