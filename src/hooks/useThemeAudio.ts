import { useEffect, useRef } from "react";
import { getGameTheme, type GameThemeId } from "../features/themes/gameThemes";
import { createThemeAudioPlayer, type ThemeAudioPlayer } from "../features/themes/themeAudio";
import { useGameAudio, type GameAudio } from "./useGameAudio";

export function useThemeAudio(themeId: GameThemeId, active = true): GameAudio {
  const theme = getGameTheme(themeId);
  const legacy = useGameAudio(theme.soundMode === "legacy");
  const player = useRef<ThemeAudioPlayer | null>(null);
  useEffect(() => {
    if (!active || theme.soundMode !== "custom" || typeof AudioContext === "undefined") return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const audio = createThemeAudioPlayer(ctx, theme.sounds);
      player.current = audio;
      return () => {
        audio.dispose();
        if (player.current === audio) player.current = null;
        void ctx!.close().catch(() => undefined);
      };
    } catch {
      // Unsupported/unavailable audio must never prevent placing blocks.
      if (ctx) void ctx.close().catch(() => undefined);
    }
  }, [active, theme]);

  if (theme.soundMode === "legacy") return legacy;
  return {
    resume: () => player.current?.resume(),
    playPlacement: () => player.current?.play("placement"),
    playClearFeedback: (cleared, removedCells = cleared) => {
      if (removedCells > 0) player.current?.play("clear", Math.max(1, cleared));
    },
    playPop: () => undefined,
    playPopup: () => undefined,
    playGameOver: () => undefined,
    resetComboSound: () => undefined,
  };
}
