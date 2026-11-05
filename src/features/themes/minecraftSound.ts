import { uniqueFeedbackCells, type FeedbackCell } from "./boardFeedback";
import { MINECRAFT_MINING_MS, MINECRAFT_ITEM_END_MS, getMinecraftStaggerStep } from "./minecraftFeedback";

export const MINECRAFT_SOUND_FAMILIES = ["stone", "metal", "slime", "coral", "nylium", "nether_wart",
  "cherry_wood", "moss_block", "glass", "amethyst_block", "grass", "cloth"] as const;
export type MinecraftSoundFamily = typeof MINECRAFT_SOUND_FAMILIES[number];
export type MinecraftSoundPreset = `mc-${MinecraftSoundFamily}-${"place" | "hit" | "break"}` | "mc-pickup";

/** Mojang bedrock-samples blocks.json + sounds.json; see the research table in docx. */
export const MINECRAFT_SOUND_PROFILES: Readonly<Record<string, { blockId: string; family: MinecraftSoundFamily }>> = {
  cyan: { blockId: "diamond_block", family: "metal" },
  lime: { blockId: "slime_block", family: "slime" },
  amber: { blockId: "honeycomb_block", family: "coral" },
  rose: { blockId: "crimson_nylium", family: "nylium" },
  violet: { blockId: "purpur_block", family: "stone" },
  blue: { blockId: "lapis_block", family: "stone" },
  teal: { blockId: "warped_wart_block", family: "nether_wart" },
  orange: { blockId: "magma_block", family: "stone" },
  pink: { blockId: "cherry_planks", family: "cherry_wood" },
  green: { blockId: "moss_block", family: "moss_block" },
  indigo: { blockId: "crying_obsidian", family: "stone" },
  ghost: { blockId: "sea_lantern", family: "glass" },
  line: { blockId: "end_stone", family: "stone" },
  echo: { blockId: "amethyst_block", family: "amethyst_block" },
  golden: { blockId: "gold_block", family: "metal" },
  bomb: { blockId: "tnt", family: "grass" },
  fill: { blockId: "emerald_block", family: "metal" },
  boost: { blockId: "magenta_wool", family: "cloth" },
};

export function getMinecraftSoundFamily(color?: string): MinecraftSoundFamily {
  return color && Object.prototype.hasOwnProperty.call(MINECRAFT_SOUND_PROFILES, color)
    ? MINECRAFT_SOUND_PROFILES[color].family : "metal";
}

export interface MinecraftSoundNote {
  preset: MinecraftSoundPreset;
  delay: number;
  gain: number;
}

/** At most one hit/break pair per material family and one pickup, even for a full board. */
export function createMinecraftClearSoundPlan(cells: readonly FeedbackCell[]): MinecraftSoundNote[] {
  const sorted = uniqueFeedbackCells(cells).sort((a, b) => a.row - b.row || a.col - b.col);
  if (!sorted.length) return [];
  const families = new Map<MinecraftSoundFamily, number>();
  const step = getMinecraftStaggerStep(sorted.length);
  sorted.forEach((cell, index) => {
    const family = getMinecraftSoundFamily(cell.color);
    if (!families.has(family)) families.set(family, index * step / 1000);
  });
  const gain = 1 / families.size;
  return [...families].flatMap(([family, delay]): MinecraftSoundNote[] => [
    { preset: `mc-${family}-hit`, delay, gain: gain * 0.48 },
    { preset: `mc-${family}-break`, delay: delay + MINECRAFT_MINING_MS / 1000, gain },
  ]).concat({ preset: "mc-pickup", delay: MINECRAFT_ITEM_END_MS / 1000, gain: 0.8 });
}
