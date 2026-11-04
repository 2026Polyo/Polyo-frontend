import type { CSSProperties } from "react";
import diamond from "../../asset/theme/minecraft/diamond_block.png";
import slime from "../../asset/theme/minecraft/slime_block.png";
import honeycomb from "../../asset/theme/minecraft/honeycomb_block.png";
import crimson from "../../asset/theme/minecraft/crimson_nylium.png";
import crimsonTop from "../../asset/theme/minecraft/crimson_nylium_top.png";
import crimsonBottom from "../../asset/theme/minecraft/crimson_nylium_bottom.png";
import purpur from "../../asset/theme/minecraft/purpur_block.png";
import lapis from "../../asset/theme/minecraft/lapis_block.png";
import warped from "../../asset/theme/minecraft/warped_wart_block.png";
import magma from "../../asset/theme/minecraft/magma_block.png";
import cherry from "../../asset/theme/minecraft/cherry_planks.png";
import moss from "../../asset/theme/minecraft/moss_block.png";
import obsidian from "../../asset/theme/minecraft/crying_obsidian.png";
import lantern from "../../asset/theme/minecraft/sea_lantern.png";
import endStone from "../../asset/theme/minecraft/end_stone.png";
import amethyst from "../../asset/theme/minecraft/amethyst_block.png";
import gold from "../../asset/theme/minecraft/gold_block.png";
import tnt from "../../asset/theme/minecraft/tnt.png";
import tntTop from "../../asset/theme/minecraft/tnt_top.png";
import tntBottom from "../../asset/theme/minecraft/tnt_bottom.png";
import emerald from "../../asset/theme/minecraft/emerald_block.png";
import wool from "../../asset/theme/minecraft/magenta_wool.png";
import crack0 from "../../asset/theme/minecraft/destroy_stage_0.png";
import crack1 from "../../asset/theme/minecraft/destroy_stage_1.png";
import crack2 from "../../asset/theme/minecraft/destroy_stage_2.png";
import crack3 from "../../asset/theme/minecraft/destroy_stage_3.png";
import crack4 from "../../asset/theme/minecraft/destroy_stage_4.png";
import crack5 from "../../asset/theme/minecraft/destroy_stage_5.png";
import crack6 from "../../asset/theme/minecraft/destroy_stage_6.png";
import crack7 from "../../asset/theme/minecraft/destroy_stage_7.png";
import crack8 from "../../asset/theme/minecraft/destroy_stage_8.png";
import crack9 from "../../asset/theme/minecraft/destroy_stage_9.png";
import poof0 from "../../asset/theme/minecraft/generic_0.png";
import poof1 from "../../asset/theme/minecraft/generic_1.png";
import poof2 from "../../asset/theme/minecraft/generic_2.png";
import poof3 from "../../asset/theme/minecraft/generic_3.png";
import poof4 from "../../asset/theme/minecraft/generic_4.png";
import poof5 from "../../asset/theme/minecraft/generic_5.png";
import poof6 from "../../asset/theme/minecraft/generic_6.png";
import poof7 from "../../asset/theme/minecraft/generic_7.png";

export interface MinecraftMaterial {
  id: string;
  name: string;
  color: string;
  texture: string;
  side: string;
  top: string;
  bottom: string;
}

function material(
  id: string,
  name: string,
  color: string,
  side: string,
  top = side,
  bottom = side,
  texture = side,
): MinecraftMaterial {
  return { id, name, color, texture, side, top, bottom };
}

/** 확정한 18색 대응표. 한 퍼즐 블록의 모든 타일은 같은 Minecraft 재질을 사용한다. */
export const MINECRAFT_MATERIALS: Readonly<Record<string, MinecraftMaterial>> =
  {
    cyan: material("diamond_block", "다이아몬드 블록", "#65e5dc", diamond),
    lime: material("slime_block", "슬라임 블록", "#75c563", slime),
    amber: material("honeycomb_block", "벌집 조각 블록", "#e8a023", honeycomb),
    rose: material(
      "crimson_nylium",
      "진홍빛 네더 균사",
      "#ab3046",
      crimson,
      crimsonTop,
      crimsonBottom,
      crimsonTop,
    ),
    violet: material("purpur_block", "퍼퍼 블록", "#aa7eaa", purpur),
    blue: material("lapis_block", "청금석 블록", "#284f9c", lapis),
    teal: material(
      "warped_wart_block",
      "뒤틀린 사마귀 블록",
      "#167e86",
      warped,
    ),
    orange: material("magma_block", "마그마 블록", "#dc762e", magma),
    pink: material("cherry_planks", "벚나무 판자", "#e7b9b3", cherry),
    green: material("moss_block", "이끼 블록", "#596e2d", moss),
    indigo: material("crying_obsidian", "우는 흑요석", "#7440b1", obsidian),
    ghost: material("sea_lantern", "바다 랜턴", "#d9eeea", lantern),
    line: material("end_stone", "엔드 돌", "#e4e5a9", endStone),
    echo: material("amethyst_block", "자수정 블록", "#9e75c9", amethyst),
    golden: material("gold_block", "금 블록", "#f5d63e", gold),
    bomb: material("tnt", "TNT", "#d34d3c", tnt, tntTop, tntBottom),
    fill: material("emerald_block", "에메랄드 블록", "#35cc6c", emerald),
    boost: material("magenta_wool", "자홍색 양털", "#b43ab4", wool),
  };

export const MINING_FRAMES = [
  crack0,
  crack1,
  crack2,
  crack3,
  crack4,
  crack5,
  crack6,
  crack7,
  crack8,
  crack9,
];
// 기존 제거 효과는 유지한다. poof.json 순서대로 큰 입자부터 작게 수축한다.
export const POOF_FRAMES = [
  poof7,
  poof6,
  poof5,
  poof4,
  poof3,
  poof2,
  poof1,
  poof0,
];

export function getMinecraftMaterial(color: string): MinecraftMaterial {
  return Object.prototype.hasOwnProperty.call(MINECRAFT_MATERIALS, color)
    ? MINECRAFT_MATERIALS[color]
    : MINECRAFT_MATERIALS.cyan;
}

export function getMinecraftMaterialStyle(color: string): CSSProperties {
  const block = getMinecraftMaterial(color);
  return {
    "--mc-face": `url("${block.texture}")`,
    "--mc-side": `url("${block.side}")`,
    "--mc-top": `url("${block.top}")`,
    "--mc-bottom": `url("${block.bottom}")`,
    "--mc-fallback": block.color,
  } as CSSProperties;
}

export function getMinecraftAnimationStyle(): CSSProperties {
  return Object.fromEntries([
    ...MINING_FRAMES.map((src, index) => [
      `--mc-crack-${index}`,
      `url("${src}")`,
    ]),
    ...POOF_FRAMES.map((src, index) => [`--mc-poof-${index}`, `url("${src}")`]),
  ]) as CSSProperties;
}

let texturesPreloaded = false;
export function preloadMinecraftTextures(): void {
  if (texturesPreloaded || typeof Image === "undefined") return;
  texturesPreloaded = true;
  const sources = new Set([
    ...Object.values(MINECRAFT_MATERIALS).flatMap((block) => [
      block.texture,
      block.side,
      block.top,
      block.bottom,
    ]),
    ...MINING_FRAMES,
    ...POOF_FRAMES,
  ]);
  // 첫 채굴에서도 모든 단계가 보이도록 테마 선택 시 작은 이미지를 미리 읽는다.
  for (const src of sources) {
    const image = new Image();
    image.src = src;
  }
}
