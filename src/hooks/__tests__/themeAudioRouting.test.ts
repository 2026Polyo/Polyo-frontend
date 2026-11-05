import { describe, expect, it, vi } from "vitest";
import { routeThemeAudio } from "../useThemeAudio";
import type { GameAudio } from "../useGameAudio";
import { getGameTheme } from "../../features/themes/gameThemes";

function sharedAudio() {
  return { resume: vi.fn(), playPop: vi.fn(), playPlacement: vi.fn(), playClearFeedback: vi.fn(),
    resetComboSound: vi.fn(), playGameOver: vi.fn(), playPopup: vi.fn() } satisfies GameAudio;
}

describe("common effects with themed field audio", () => {
  it.each(["theme_classic", "theme_neon", "theme_jelly", "theme_minecraft", "theme_cat"])(
    "%s keeps buttons, popups, game-over and combo reset shared", id => {
      const shared = sharedAudio();
      const theme = { play: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
      const audio = routeThemeAudio(shared, () => theme, getGameTheme(id).soundMode === "custom");
      audio.resume(); audio.playPop(); audio.playPopup(); audio.playGameOver(); audio.resetComboSound();
      for (const event of ["resume", "playPop", "playPopup", "playGameOver", "resetComboSound"] as const) {
        expect(shared[event]).toHaveBeenCalledOnce();
      }
      expect(theme.play).not.toHaveBeenCalled();
    },
  );
  it("replaces only neon placement, while clear voice/combo and neon removal both play once", () => {
    const shared = sharedAudio(), theme = { play: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
    const audio = routeThemeAudio(shared, () => theme, true);
    audio.playPlacement();
    expect(shared.playPlacement).not.toHaveBeenCalled();
    expect(theme.play).toHaveBeenNthCalledWith(1, "placement");
    audio.playClearFeedback(2, 15);
    expect(shared.playClearFeedback).toHaveBeenCalledExactlyOnceWith(2);
    expect(theme.play).toHaveBeenNthCalledWith(2, "clear", 2);
    audio.playClearFeedback(0, 0);
    expect(theme.play).toHaveBeenCalledTimes(2);
    audio.playClearFeedback(0, 3);
    expect(theme.play).toHaveBeenLastCalledWith("clear", 1);
  });
  it.each(["theme_classic", "theme_jelly", "theme_minecraft", "theme_cat"])(
    "%s uses the existing field sound until a custom cue is ready", id => {
      const shared = sharedAudio(), theme = { play: vi.fn(), resume: vi.fn(), dispose: vi.fn() };
      const audio = routeThemeAudio(shared, () => theme, getGameTheme(id).soundMode === "custom");
      audio.playPlacement(); audio.playClearFeedback(1, 8);
      expect(shared.playPlacement).toHaveBeenCalledOnce();
      expect(shared.playClearFeedback).toHaveBeenCalledExactlyOnceWith(1);
      expect(theme.play).not.toHaveBeenCalled();
    },
  );
  it("keeps existing audio available when themed audio cannot initialize", () => {
    const shared = sharedAudio();
    const audio = routeThemeAudio(shared, () => null, true);
    audio.playPlacement(); audio.playClearFeedback(1, 8); audio.playGameOver();
    expect(shared.playPlacement).toHaveBeenCalledOnce();
    expect(shared.playClearFeedback).toHaveBeenCalledExactlyOnceWith(1);
    expect(shared.playGameOver).toHaveBeenCalledOnce();
  });
});
