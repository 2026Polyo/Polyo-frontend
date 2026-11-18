import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { colorClass } from "../../constants/gameData";
import PieceShape from "../../components/PieceShape";
import MinecraftItemCube from "../../components/MinecraftItemCube";
import { ThemeScope } from "../../components/ThemeScope";
import { getGameTheme, getThemeSound } from "../themes/gameThemes";
import { createBoardFeedback } from "../themes/boardFeedback";
import {
  getMinecraftMaterial,
  getMinecraftMaterialStyle,
  MINECRAFT_MATERIALS,
  MINING_FRAMES,
  POOF_FRAMES,
} from "../themes/minecraftMaterials";
import {
  createMinecraftEffectBatch,
  MINECRAFT_MINING_MS,
  MINECRAFT_ITEM_MS,
  MINECRAFT_POOF_MS,
  MINECRAFT_EFFECT_LIFETIME_MS,
  MINECRAFT_STAGGER_MAX_MS,
  MINECRAFT_ITEM_END_MS,
  MINECRAFT_POOF_START_MS,
} from "../themes/minecraftFeedback";
import type { Board, PieceInstance } from "../../types";

const single: PieceInstance = {
  id: "monomino-single",
  uid: "single",
  color: "cyan",
  cells: [[0, 0]],
};

describe("minecraft materials and player scope", () => {
  it("maps all 18 colors to distinct approved blocks and safely handles unknown colors", () => {
    expect(Object.keys(MINECRAFT_MATERIALS).sort()).toEqual(
      Object.keys(colorClass).sort(),
    );
    expect(
      new Set(Object.values(MINECRAFT_MATERIALS).map((block) => block.id)).size,
    ).toBe(18);
    expect(getMinecraftMaterial("rose").id).toBe("crimson_nylium");
    expect(getMinecraftMaterial("violet").id).toBe("purpur_block");
    expect(getMinecraftMaterial("bomb").id).toBe("tnt");
    for (const color of ["unknown", "__proto__", "constructor"])
      expect(getMinecraftMaterial(color).id).toBe("diamond_block");
  });

  it("keeps distinct TNT faces and uses the crimson surface on the field", () => {
    const tnt = getMinecraftMaterial("bomb");
    expect(new Set([tnt.side, tnt.top, tnt.bottom]).size).toBe(3);
    const crimson = getMinecraftMaterial("rose");
    expect(crimson.texture).toBe(crimson.top);
    expect(crimson.side).not.toBe(crimson.top);
    expect(getMinecraftMaterialStyle("bomb")).toHaveProperty("--mc-top");
    expect(new Set(MINING_FRAMES).size).toBe(10);
    expect(new Set(POOF_FRAMES).size).toBe(8);
    expect(POOF_FRAMES[0]).toContain("generic_7");
    expect(POOF_FRAMES[7]).toContain("generic_0");
  });

  it("renders six cube faces and does not replace player-specific materials", () => {
    const markup = renderToStaticMarkup(<MinecraftItemCube color="bomb" />);
    expect(markup.match(/<i /g)).toHaveLength(6);
    expect(markup).toContain('data-mc-block="tnt"');
    const piece = {
      ...single,
      cells: [
        [0, 0],
        [1, 0],
        [1, 1],
      ] as [number, number][],
    };
    const scoped = renderToStaticMarkup(
      <ThemeScope themeId="theme_minecraft">
        <PieceShape piece={piece} />
        <ThemeScope themeId="theme_jelly">
          <PieceShape piece={piece} />
        </ThemeScope>
        <ThemeScope themeId="theme_classic">
          <PieceShape piece={piece} />
        </ThemeScope>
      </ThemeScope>,
    );
    expect(scoped.match(/data-mc-block="diamond_block"/g)).toHaveLength(3);
    expect(scoped.match(/class="jelly-tile-face"/g)).toHaveLength(3);
    expect(scoped.match(/data-game-theme="theme_classic"/g)).toHaveLength(1);
  });

  it("provides material-aware sounds and keeps classic audio unchanged", () => {
    const theme = getGameTheme("theme_minecraft");
    expect(theme.id).toBe("theme_minecraft");
    expect(theme.soundMode).toBe("custom");
    expect(getThemeSound(theme.id, "placement")?.kind).toBe("minecraft");
    expect(getThemeSound(theme.id, "clear")?.kind).toBe("minecraft");
    expect(getGameTheme("theme_classic").soundMode).toBe("legacy");
  });
});

describe("minecraft mining feedback", () => {
  it("does not spawn items from empty cells inside a special clear area", () => {
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    board[2][3] = "bomb";
    const feedback = createBoardFeedback(
      1,
      single,
      0,
      0,
      board,
      new Set(["2-3", "2-4", "2-5", "99-0"]),
    );
    expect(feedback.cleared).toEqual([{ row: 2, col: 3, color: "bomb" }]);
    expect(board[2][4]).toBeNull();
  });

  it("copies the removed materials and filters duplicate or invalid coordinates", () => {
    const feedback = {
      id: 3,
      placed: [],
      cleared: [
        { row: 1, col: 2, color: "rose" },
        { row: 1, col: 2, color: "rose" },
        { row: 99, col: 0, color: "cyan" },
      ],
    };
    const original = structuredClone(feedback);
    const batch = createMinecraftEffectBatch(feedback);
    expect(batch.cleared).toHaveLength(1);
    expect(batch.cleared[0].color).toBe("rose");
    batch.cleared[0].color = "cyan";
    expect(feedback).toEqual(original);
    expect(
      createMinecraftEffectBatch({
        id: 4,
        placed: [{ row: 0, col: 0, color: "cyan" }],
        cleared: [],
      }).cleared,
    ).toEqual([]);
  });

  it("preserves mining before item rotation and poof near the end, with bounded cleanup", () => {
    const batch = createMinecraftEffectBatch({
      id: 1,
      placed: [],
      cleared: Array.from({ length: 64 }, (_, index) => ({
        row: Math.floor(index / 8),
        col: index % 8,
        color: "cyan",
      })),
    });
    expect(batch.cleared).toHaveLength(64);
    expect(batch.cleared.flatMap((cell) => cell.poofs)).toHaveLength(320);
    for (const cell of batch.cleared) {
      expect(cell.rotation).toBeGreaterThanOrEqual(0);
      expect(cell.rotation).toBeLessThan(360);
      expect(cell.offset).toBeLessThanOrEqual(MINECRAFT_STAGGER_MAX_MS);
      expect(MINECRAFT_MINING_MS + cell.offset + cell.itemDuration).toBeCloseTo(
        MINECRAFT_ITEM_END_MS,
      );
      expect(cell.itemDuration).toBeGreaterThanOrEqual(MINECRAFT_ITEM_MS);
      for (const poof of cell.poofs) {
        expect(poof.delay).toBe(MINECRAFT_POOF_START_MS);
        expect(poof.delay + MINECRAFT_POOF_MS).toBeLessThan(
          MINECRAFT_EFFECT_LIFETIME_MS,
        );
      }
    }
  });

  it("mines from top-left in row order and gives every item the same disappearance time", () => {
    const cleared = [
      { row: 4, col: 1, color: "cyan" },
      { row: 0, col: 7, color: "blue" },
      { row: 2, col: 0, color: "rose" },
      { row: 0, col: 0, color: "lime" },
    ];
    const before = structuredClone(cleared);
    const batch = createMinecraftEffectBatch({ id: 9, placed: [], cleared });
    expect(batch.cleared.map(({ row, col }) => `${row}-${col}`)).toEqual([
      "0-0",
      "0-7",
      "2-0",
      "4-1",
    ]);
    expect(batch.cleared.map(({ offset }) => offset)).toEqual([
      0, 55, 110, 165,
    ]);
    expect(
      new Set(
        batch.cleared.flatMap((cell) => cell.poofs.map((poof) => poof.delay)),
      ).size,
    ).toBe(1);
    for (const cell of batch.cleared)
      expect(MINECRAFT_MINING_MS + cell.offset + cell.itemDuration).toBeCloseTo(
        MINECRAFT_ITEM_END_MS,
      );
    expect(cleared).toEqual(before);
  });

  it("does not consume gameplay randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw Error("Gameplay random consumed");
    });
    try {
      expect(
        createMinecraftEffectBatch({
          id: 1,
          placed: [],
          cleared: [{ row: 1, col: 1, color: "cyan" }],
        }).cleared,
      ).toHaveLength(1);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
