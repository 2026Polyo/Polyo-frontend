import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadPreviewTheme,
  savePreviewTheme,
  THEME_PREVIEW_STORAGE_KEY,
} from "../themes/themePreview";

afterEach(() => vi.unstubAllGlobals());

describe("local theme preview preference", () => {
  it("remembers a supported preview independently of game progress", () => {
    const saved = new Map([["block-blast-current-game", "existing game"]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    expect(loadPreviewTheme()).toBe("theme_classic");
    savePreviewTheme("theme_neon");
    expect(loadPreviewTheme()).toBe("theme_neon");
    expect([...saved.keys()]).toEqual([
      "block-blast-current-game",
      THEME_PREVIEW_STORAGE_KEY,
    ]);
    expect(saved.get("block-blast-current-game")).toBe("existing game");
  });

  it("falls back for unsupported, corrupted, and prototype-like stored values", () => {
    for (const value of [
      null,
      "unknown",
      "__proto__",
      '{"themeId":"theme_neon"}',
    ]) {
      vi.stubGlobal("localStorage", { getItem: () => value });
      expect(loadPreviewTheme()).toBe("theme_classic");
    }
  });

  it("permits previewing when browser storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Storage blocked");
      },
      setItem: () => {
        throw new Error("Storage blocked");
      },
    });
    expect(loadPreviewTheme()).toBe("theme_classic");
    expect(() => savePreviewTheme("theme_neon")).not.toThrow();
  });
});
