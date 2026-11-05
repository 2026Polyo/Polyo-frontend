import { useEffect, useRef } from "react";
import { getGameTheme, type GameThemeId } from "../features/themes/gameThemes";
import { createThemeAudioPlayer, type ThemeAudioPlayer } from "../features/themes/themeAudio";
import { useGameAudio, type GameAudio } from "./useGameAudio";

/** UI, game-over, clear voice and combo cues are shared; only field cues are replaced. */
export function routeThemeAudio(
  shared: GameAudio,
  getPlayer: () => ThemeAudioPlayer | null,
  customFields: boolean,
): GameAudio {
  return {
    ...shared,
    playPlacement: () => {
      const player = customFields ? getPlayer() : null;
      if (player) player.play("placement");
      else shared.playPlacement();
    },
    playClearFeedback: (cleared, removedCells = cleared) => {
      shared.playClearFeedback(cleared);
      if (customFields && removedCells > 0) getPlayer()?.play("clear", Math.max(1, cleared));
    },
  };
}

export function useThemeAudio(themeId: GameThemeId, active = true): GameAudio {
  const theme = getGameTheme(themeId);
  // Unlock this one context from the start-screen gesture, before entering play.
  const context = useRef<AudioContext | null>(null);
  const shared = useGameAudio(true, context);
  const player = useRef<ThemeAudioPlayer | null>(null);
  useEffect(() => {
    const ctx = context.current;
    if (!active || theme.soundMode !== "custom" || !ctx) return;
    try {
      const audio = createThemeAudioPlayer(ctx, theme.sounds);
      player.current = audio;
      return () => {
        audio.dispose();
        if (player.current === audio) player.current = null;
      };
    } catch {
      // Unsupported/unavailable audio must never prevent placing blocks.
    }
  }, [active, theme]);

  return routeThemeAudio(shared, () => player.current, theme.soundMode === "custom");
}
