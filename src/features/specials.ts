import { createBombTemplate, isValidBombPiece } from "./bombBlocks";
import { createBoostTemplate, isValidBoostPiece } from "./boostBlocks";
import { createEchoTemplate, isValidEchoPiece } from "./echoBlocks";
import { createFillTemplate, isValidFillPiece } from "./fillBlocks";
import { createGoldenTemplate, isValidGoldenPiece } from "./goldenBlocks";
import { createGhostTemplate, isValidGhostPiece } from "./ghosts";
import { createLineTemplate, isValidLinePiece } from "./lineBlocks";
import { getPieceTemplate, LOCKABLE_BLOCK_IDS } from "../constants/gameData";
import { shuffle } from "../utils/shuffle";
import type { PieceTemplate, SpecialType } from "../types";

interface SpecialDefinition {
  create: () => PieceTemplate;
  label: string;
  summary: string;
  validate: (piece: unknown) => boolean;
}

// Single source of truth for special blocks. Adding a new special means adding one entry
// here (plus its block module and the `SpecialType` union) — the random roll, validation,
// labels, and summaries all derive from this registry.
const SPECIAL_REGISTRY: Record<SpecialType, SpecialDefinition> = {
  ghost: {
    create: createGhostTemplate,
    label: "고스트 블록",
    summary: "블록이 있는 칸 위에도 놓을 수 있고, 겹친 칸이 제거되면 추가 점수를 얻습니다.",
    validate: isValidGhostPiece
  },
  line: {
    create: createLineTemplate,
    label: "라인 블록",
    summary: "각 칸이 속한 행과 열을 즉시 모두 제거합니다.",
    validate: isValidLinePiece
  },
  echo: {
    create: createEchoTemplate,
    label: "에코 블록",
    summary: "설치 시 보드에 쌓인 블록 수에 비례해 추가 점수를 얻습니다.",
    validate: isValidEchoPiece
  },
  golden: {
    create: createGoldenTemplate,
    label: "황금 블록",
    summary: "황금 칸이 줄 제거에 포함되면 그 칸 점수를 두 배로 얻습니다.",
    validate: isValidGoldenPiece
  },
  bomb: {
    create: createBombTemplate,
    label: "폭탄 블록",
    summary: "이 블록이 줄 제거로 사라질 때 그 칸의 행과 열을 폭파합니다.",
    validate: isValidBombPiece
  },
  fill: {
    create: createFillTemplate,
    label: "채움 블록",
    summary: "설치 시 상하좌우 한 칸 이내의 빈 칸을 채웁니다.",
    validate: isValidFillPiece
  },
  boost: {
    create: createBoostTemplate,
    label: "강화 블록",
    summary: "보드에 놓여 있는 동안 칸마다 획득 점수가 증가합니다.",
    validate: isValidBoostPiece
  }
};

const SPECIAL_TYPES = Object.keys(SPECIAL_REGISTRY) as SpecialType[];

// Display names for special blocks, shown in the reward and choice modals.
export const SPECIAL_LABELS: Record<SpecialType, string> = Object.fromEntries(
  SPECIAL_TYPES.map((type) => [type, SPECIAL_REGISTRY[type].label])
) as Record<SpecialType, string>;

// One-line effect descriptions, shown in the special-block choice modal.
export const SPECIAL_SUMMARIES: Record<SpecialType, string> = Object.fromEntries(
  SPECIAL_TYPES.map((type) => [type, SPECIAL_REGISTRY[type].summary])
) as Record<SpecialType, string>;

export function createRandomSpecialTemplate(): PieceTemplate {
  const [type] = shuffle(SPECIAL_TYPES);
  return SPECIAL_REGISTRY[type].create();
}

// Offer `count` distinct special-block types (each with a random shape) to choose from.
export function createSpecialChoices(count: number): PieceTemplate[] {
  return shuffle(SPECIAL_TYPES)
    .slice(0, Math.min(count, SPECIAL_TYPES.length))
    .map((type) => SPECIAL_REGISTRY[type].create());
}

// Offer `count` reward choices mixing special-effect blocks with still-locked base shapes
// (the latter unlock a plain block). `unlockedBaseIds` are base shapes already unlocked.
export function createRewardChoices(count: number, unlockedBaseIds: string[]): PieceTemplate[] {
  const unlocked = new Set(unlockedBaseIds);
  const lockedBase = LOCKABLE_BLOCK_IDS
    .filter((id) => !unlocked.has(id))
    .map((id) => getPieceTemplate(id))
    .filter((piece): piece is PieceTemplate => piece !== undefined);
  const specials = SPECIAL_TYPES.map((type) => SPECIAL_REGISTRY[type].create());
  return shuffle([...lockedBase, ...specials]).slice(0, Math.min(count, lockedBase.length + specials.length));
}

export function isValidSpecialPiece(piece: unknown): boolean {
  return SPECIAL_TYPES.some((type) => SPECIAL_REGISTRY[type].validate(piece));
}
