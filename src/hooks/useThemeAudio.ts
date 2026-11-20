import { useEffect, useRef, type RefObject } from "react";
import { getGameTheme, type GameTheme, type GameThemeId } from "../features/themes/gameThemes";
import { createThemeAudioPlayer, type ThemeAudioPlayer } from "../features/themes/themeAudio";
import { preloadMinecraftOriginalAudio } from "../features/themes/minecraftOriginalAudio";
import { preloadThemeFiles } from "../features/themes/themeFileAudio";
import { useGameAudio, type GameAudio } from "./useGameAudio";

/** UI, game-over, clear voice and combo cues are shared; only field cues are replaced. */
export function routeThemeAudio(
  shared: GameAudio,
  getPlayer: () => ThemeAudioPlayer | null,
  customFields: boolean,
): GameAudio {
  return {
    ...shared,
    playPlacement: color => {
      const player = customFields ? getPlayer() : null;
      if (player) player.play("placement", 1, { color });
      else shared.playPlacement();
    },
    playClearFeedback: (cleared, removedCells = cleared, cells) => {
      shared.playClearFeedback(cleared);
      if (customFields && removedCells > 0) getPlayer()?.play("clear", Math.max(1, cleared), { cells });
    },
  };
}

export function useThemeAudio(themeId: GameThemeId, active = true): GameAudio {
  const theme = getGameTheme(themeId);
  // Unlock this one context from the start-screen gesture, before entering play.
  const context = useRef<AudioContext | null>(null);
  const shared = useGameAudio(true, context);
  useEffect(() => {
    const ctx = context.current;
    if (active || !ctx) return;
    const cue = theme.sounds.placement;
    if (cue?.kind === "minecraft") void preloadMinecraftOriginalAudio(ctx).catch(() => undefined);
    if (cue?.kind === "file" || cue?.kind === "files") void preloadThemeFiles(ctx, cue);
  }, [active, theme]);
  const player = useThemeFieldPlayer(context, theme, active);

  return routeThemeAudio(shared, () => player.current, theme.soundMode === "custom");
}

/** The field-cue player for one theme on a context that the shared cues already opened. */
function useThemeFieldPlayer(
  context: RefObject<AudioContext | null>,
  theme: GameTheme,
  active: boolean,
): RefObject<ThemeAudioPlayer | null> {
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
  }, [active, context, theme]);
  return player;
}

export interface MatchThemeAudio {
  /** For my moves: field cues in my theme. */
  mine: GameAudio;
  /** For the rival's moves: field cues in the theme their board is drawn in. */
  rival: GameAudio;
}

/**
 * Match play: both players' cues share one context and one set of common cues (clear voice, combo,
 * game over), while each player's field cues come from their own theme player.
 */
export function useMatchThemeAudio(myThemeId: GameThemeId, rivalThemeId: GameThemeId): MatchThemeAudio {
  const myTheme = getGameTheme(myThemeId);
  const rivalTheme = getGameTheme(rivalThemeId);
  const context = useRef<AudioContext | null>(null);
  const shared = useGameAudio(true, context);
  const myPlayer = useThemeFieldPlayer(context, myTheme, true);
  const rivalPlayer = useThemeFieldPlayer(context, rivalTheme, true);
  return {
    mine: routeThemeAudio(shared, () => myPlayer.current, myTheme.soundMode === "custom"),
    rival: routeThemeAudio(shared, () => rivalPlayer.current, rivalTheme.soundMode === "custom"),
  };
}
