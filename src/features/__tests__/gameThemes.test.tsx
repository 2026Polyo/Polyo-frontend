import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { colorClass } from "../../constants/gameData";
import {
  getGameTheme,
  getThemeSound,
  getThemeTileColor,
  getThemeTileStyle,
} from "../themes/gameThemes";
import {
  createBoardFeedback,
  createPixelParticles,
  MELT_GRID_SIZE,
  PIXEL_EFFECT_LIFETIME_MS,
  PLACEMENT_PARTICLE_COUNT,
  uniqueFeedbackCells,
} from "../themes/boardFeedback";
import { ThemeScope } from "../../components/ThemeScope";
import PieceShape from "../../components/PieceShape";
import type { Board, PieceInstance } from "../../types";

const piece: PieceInstance = {
  id: "domino",
  uid: "piece_1",
  color: "cyan",
  cells: [
    [0, 0],
    [0, 1],
  ],
};

describe("player-scoped game themes", () => {
  it("falls back safely for unknown and prototype-like theme IDs", () => {
    for (const id of [undefined, "unknown", "__proto__", "constructor"]) {
      expect(getGameTheme(id).id).toBe("theme_classic");
    }
  });

  it("provides distinct neon colors for every existing block type", () => {
    const theme = getGameTheme("theme_neon");
    for (const color of Object.keys(colorClass)) {
      expect(theme.palette[color]).toMatch(/^#[\da-f]{6}$/i);
    }
    expect(getThemeTileColor(theme, "__proto__")).toBe("#32f4ff");
    expect(
      getThemeTileStyle(getGameTheme("theme_classic"), "cyan"),
    ).toBeUndefined();
  });

  it("provides custom field sounds for all four themes", () => {
    expect(getGameTheme("theme_neon").soundMode).toBe("custom");
    expect(getThemeSound("theme_neon", "placement")?.kind).toBe("synth");
    expect(getThemeSound("theme_neon", "clear")?.kind).toBe("synth");
    for (const id of ["theme_jelly", "theme_minecraft", "theme_cat"]) {
      expect(getGameTheme(id).soundMode).toBe("custom");
      expect(getThemeSound(id, "placement")).not.toBeNull();
      expect(getThemeSound(id, "clear")).not.toBeNull();
    }
    expect(getGameTheme("theme_classic").soundMode).toBe("legacy");
  });

  it("uses a bundled space image", () => {
    const background = getGameTheme("theme_neon").background;
    expect(background?.src).toContain("neon-space.jpg");
  });

  it("isolates each player's theme and permits nested overrides", () => {
    const markup = renderToStaticMarkup(
      <ThemeScope themeId="theme_neon">
        <PieceShape piece={piece} />
        <ThemeScope themeId="theme_classic">
          <PieceShape piece={piece} />
        </ThemeScope>
        <PieceShape piece={piece} />
      </ThemeScope>,
    );
    expect(markup.match(/data-game-theme="theme_neon"/g)).toHaveLength(2);
    expect(markup.match(/data-game-theme="theme_classic"/g)).toHaveLength(1);
    expect(markup.match(/--theme-tile-color:/g)).toHaveLength(4);
    expect(piece.color).toBe("cyan");
  });
});

describe("visual feedback separated from game resolution", () => {
  it("copies placed and cleared cells without changing gameplay inputs", () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[2][3] = "rose";
    const clearing = new Set([
      "2-3",
      "not-a-cell",
      "-1-0",
      "2-3-extra",
      "99-99",
    ]);
    const before = JSON.stringify({ board, piece, clearing: [...clearing] });
    const feedback = createBoardFeedback(10, piece, 4, 5, board, clearing);

    expect(feedback).toEqual({
      id: 10,
      placed: [
        { row: 4, col: 5, color: "cyan" },
        { row: 4, col: 6, color: "cyan" },
      ],
      cleared: [{ row: 2, col: 3, color: "rose" }],
    });
    expect(JSON.stringify({ board, piece, clearing: [...clearing] })).toBe(
      before,
    );
    feedback.placed[0].color = "blue";
    expect(piece.color).toBe("cyan");
  });

  it("filters duplicate and invalid coordinates and bounds cells to the board", () => {
    const cells = Array.from({ length: 100 }, (_, index) => ({
      row: Math.floor(index / 10),
      col: index % 10,
      color: "cyan",
    }));
    const result = uniqueFeedbackCells([
      ...cells,
      cells[0],
      { row: NaN, col: 1, color: "cyan" },
      { row: 1.5, col: 0, color: "cyan" },
      { row: -1, col: 0, color: "cyan" },
    ]);
    expect(result).toHaveLength(64);
    expect(new Set(result.map(({ row, col }) => `${row}-${col}`)).size).toBe(
      64,
    );
  });

  it("allows radial placement motion in every quadrant with varied sizes and speeds", () => {
    let seed = 38;
    const random = () =>
      ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
    const particles = Array.from({ length: 20 }, () =>
      createPixelParticles("place", random),
    ).flat();
    expect(particles).toHaveLength(20 * PLACEMENT_PARTICLE_COUNT);
    expect(new Set(particles.map(({ x, y }) => `${x > 0},${y > 0}`)).size).toBe(
      4,
    );
    expect(new Set(particles.map(({ size }) => size)).size).toBeGreaterThan(1);
    const speeds = particles.map(
      ({ x, y, duration }) => (Math.hypot(x, y) * 1000) / duration,
    );
    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(45);
    expect(Math.max(...speeds)).toBeLessThan(145);
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeGreaterThan(50);
    for (const particle of particles) {
      const offsetX = particle.left - 50;
      const offsetY = particle.top - 50;
      // 시작 위치는 정사각 블록 밖의 원 둘레이고, 이동 방향도 같은 반지름 방향이다.
      expect(Math.max(Math.abs(offsetX), Math.abs(offsetY))).toBeGreaterThan(
        50,
      );
      expect(Math.hypot(offsetX, offsetY)).toBeGreaterThanOrEqual(76 - 1e-10);
      expect(Math.hypot(offsetX, offsetY)).toBeLessThan(80);
      expect(offsetX * particle.x + offsetY * particle.y).toBeGreaterThan(0);
      expect(offsetX * particle.y - offsetY * particle.x).toBeCloseTo(0, 8);
      expect(particle.size).toBeGreaterThanOrEqual(2);
      expect(particle.size).toBeLessThan(5.5);
      expect(particle.delay + particle.duration).toBeLessThan(
        PIXEL_EFFECT_LIFETIME_MS,
      );
    }
  });

  it("covers each tile with small melt pixels and finishes before cleanup", () => {
    const particles = createPixelParticles("clear");
    expect(particles).toHaveLength(MELT_GRID_SIZE ** 2);
    expect(
      new Set(particles.map(({ left, top }) => `${left},${top}`)).size,
    ).toBe(MELT_GRID_SIZE ** 2);
    for (const particle of particles) {
      expect(particle.left + particle.size).toBeLessThanOrEqual(100);
      expect(particle.top + particle.size).toBeLessThanOrEqual(100);
      expect(particle.y).toBeGreaterThan(0);
      expect(Math.abs(particle.x)).toBeLessThanOrEqual(4);
      expect(particle.delay + particle.duration).toBeLessThan(
        PIXEL_EFFECT_LIFETIME_MS,
      );
    }
  });

  it("does not consume gameplay randomness", () => {
    const gameplayRandom = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Visual feedback must not consume gameplay randomness");
    });
    try {
      expect(createPixelParticles("place")).toHaveLength(
        PLACEMENT_PARTICLE_COUNT,
      );
      expect(createPixelParticles("clear")).toHaveLength(MELT_GRID_SIZE ** 2);
      expect(gameplayRandom).not.toHaveBeenCalled();
    } finally {
      gameplayRandom.mockRestore();
    }
  });

  it("propagates melting upward along a connected, different path for each tile", () => {
    const paths = Array.from({ length: 12 }, (_, tile) => {
      let seed = tile + 1;
      return createPixelParticles(
        "clear",
        () => ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646,
      );
    });
    for (const pixels of paths) {
      const earliest = Math.min(...pixels.map((pixel) => pixel.delay));
      expect(
        pixels.findIndex((pixel) => pixel.delay === earliest),
      ).toBeGreaterThanOrEqual(MELT_GRID_SIZE * (MELT_GRID_SIZE - 1));
      for (let row = 0; row < MELT_GRID_SIZE - 1; row++) {
        for (let col = 0; col < MELT_GRID_SIZE; col++) {
          const below = (row + 1) * MELT_GRID_SIZE;
          const neighbors = pixels.slice(
            below + Math.max(0, col - 1),
            below + Math.min(MELT_GRID_SIZE, col + 2),
          );
          expect(pixels[row * MELT_GRID_SIZE + col].delay).toBeGreaterThan(
            Math.min(...neighbors.map((pixel) => pixel.delay)),
          );
        }
      }
    }
    const relativePaths = paths.map((pixels) => {
      const first = Math.min(...pixels.map((pixel) => pixel.delay));
      return JSON.stringify(
        pixels.map((pixel) => Math.round(pixel.delay - first)),
      );
    });
    expect(new Set(relativePaths).size).toBe(paths.length);
  });
});
