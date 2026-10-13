import { Bomb, Boxes, Eraser, Flame, Gauge, Gift, HandCoins, Layers, Link, Pickaxe, Plus, RefreshCw, Rocket, Shield, Shuffle, Sparkles, Star, Tag, Thermometer, TrendingUp, Zap } from "lucide-react";
import type { AugmentDetail, AugmentId, AugmentType } from "../types";

export const AUGMENT_CHOICE_COUNT = 3;
export const AUGMENT_BASE_SCORE = 50;
export const AUGMENT_SCORE_RATE = 0.1;

type AugmentNumberKey =
  | "allClearScoreBonus"
  | "augmentDiscountMax"
  | "augmentDiscountPerLevel"
  | "boardPressureScoreBonus"
  | "boardPressureThreshold"
  | "cellClearBonus"
  | "cellPlacementBonus"
  | "clearMultPerLevel"
  | "comboAccelPerCombo"
  | "comboBaseBonus"
  | "comboClearScoreBonus"
  | "comboCorrectionMax"
  | "comboCorrectionPerLevel"
  | "crackClearBonus"
  | "itemChainRate"
  | "itemDiscountPerLevel"
  | "itemGainScoreBonus"
  | "itemUseScoreBonus"
  | "multiLineBaseBonus"
  | "multiLineScoreBonus"
  | "overheatBonus"
  | "placementMultPerLevel"
  | "spreadClearChancePerLevel"
  | "spreadFillChancePerLevel";

export interface AugmentDefinition extends AugmentDetail {
  maxLevel?: number;
  numbers?: Partial<Record<AugmentNumberKey, number>>;
}

export const AUGMENT_DEFINITIONS: AugmentDefinition[] = [
  {
    Icon: Plus,
    id: "placement-score",
    type: "placement",
    label: "배치 1",
    summary: "블록을 배치할 때 얻는 점수가 증가합니다.",
    numbers: { placementMultPerLevel: 0.1 }
  },
  {
    Icon: Boxes,
    id: "cell-placement-bonus",
    type: "placement",
    label: "배치 2",
    summary: "배치한 칸 수에 비례해 추가 점수를 얻습니다.",
    numbers: { cellPlacementBonus: 1 }
  },
  {
    Icon: Zap,
    id: "spread-fill",
    type: "placement",
    label: "확산",
    summary: "블록 설치 시 일정 확률로 근처 빈 칸을 채웁니다.",
    numbers: { spreadFillChancePerLevel: 0.04 }
  },
  {
    Icon: Star,
    id: "all-clear",
    type: "placement",
    label: "올클리어",
    summary: "보드를 완전히 비우면 추가 점수를 얻습니다.",
    numbers: { allClearScoreBonus: 50 }
  },
  {
    Icon: Sparkles,
    id: "clear-score",
    type: "clear",
    label: "제거 1",
    summary: "줄을 제거할 때 얻는 점수가 증가합니다.",
    numbers: { clearMultPerLevel: 0.1 }
  },
  {
    Icon: Eraser,
    id: "cell-clear-bonus",
    type: "clear",
    label: "제거 2",
    summary: "제거된 칸 수에 비례해 추가 점수를 얻습니다.",
    numbers: { cellClearBonus: 2 }
  },
  {
    Icon: Bomb,
    id: "spread-clear",
    type: "clear",
    label: "연쇄 제거",
    summary: "줄 제거 시 일정 확률로 근처 줄도 함께 제거됩니다.",
    numbers: { spreadClearChancePerLevel: 0.04 }
  },
  {
    Icon: Pickaxe,
    id: "crack-clear",
    type: "clear",
    label: "합산",
    summary: "제거된 줄과 인접한 블록 수에 비례해 추가 점수를 얻습니다.",
    numbers: { crackClearBonus: 2 }
  },
  {
    Icon: Flame,
    id: "tray-combo",
    type: "combo",
    label: "콤보",
    summary: "콤보 추가 점수가 증가합니다.",
    numbers: { comboBaseBonus: 5, comboClearScoreBonus: 5 }
  },
  {
    Icon: TrendingUp,
    id: "combo-accel",
    type: "combo",
    label: "콤보 가속",
    summary: "콤보가 높을수록 획득 점수 배율이 증가합니다.",
    numbers: { comboAccelPerCombo: 0.01 }
  },
  {
    Icon: Shield,
    id: "combo-retain",
    type: "combo",
    label: "콤보 유지",
    summary: "콤보가 끊길 상황에서 일정 횟수 콤보를 유지합니다(줄 제거 시 충전)."
  },
  {
    Icon: Shuffle,
    id: "combo-correction",
    type: "combo",
    label: "콤보 보정",
    summary: "콤보를 이어가기 쉬운 블록이 나올 확률이 증가합니다.",
    numbers: { comboCorrectionMax: 0.9, comboCorrectionPerLevel: 0.15 }
  },
  {
    Icon: Layers,
    id: "multi-line",
    type: "multiline",
    label: "멀티라인",
    summary: "여러 줄을 한 번에 제거하면 추가 점수를 얻습니다.",
    numbers: { multiLineBaseBonus: 15, multiLineScoreBonus: 10 }
  },
  {
    Icon: Gauge,
    id: "board-pressure",
    type: "multiline",
    label: "포화",
    summary: "보드가 80% 이상 채워진 상태에서 블록을 배치하면 추가 점수를 얻습니다.",
    numbers: { boardPressureScoreBonus: 10, boardPressureThreshold: 0.8 }
  },
  {
    Icon: Thermometer,
    id: "overheat",
    type: "multiline",
    label: "과열",
    summary: "줄 제거 없이 배치할수록 다음 줄 제거 점수가 증가합니다.",
    numbers: { overheatBonus: 3 }
  },
  {
    Icon: RefreshCw,
    id: "reroll-power",
    type: "item",
    label: "다시뽑기",
    summary: "다시뽑기 아이템이 강화됩니다. 레벨에 따라 바꿀 블록을 직접 고르고, 개수가 늘며, 새 블록도 선택할 수 있습니다.",
    maxLevel: 5
  },
  {
    Icon: Tag,
    id: "item-discount",
    type: "item",
    label: "아이템 조건 약화",
    summary: "아이템 획득에 필요한 콤보 수가 줄어듭니다.",
    numbers: { itemDiscountPerLevel: 2 }
  },
  {
    Icon: Gift,
    id: "item-gain-score",
    type: "item",
    label: "보급 점수",
    summary: "아이템을 획득할 때마다 추가 점수를 얻습니다.",
    numbers: { itemGainScoreBonus: 20 }
  },
  {
    Icon: HandCoins,
    id: "item-use-score",
    type: "item",
    label: "사용 보너스",
    summary: "아이템을 사용할 때마다 추가 점수를 얻습니다.",
    numbers: { itemUseScoreBonus: 15 }
  },
  {
    Icon: Link,
    id: "item-chain",
    type: "item",
    label: "아이템 연계",
    summary: "아이템 사용 후 다음 배치 점수가 증가합니다.",
    numbers: { itemChainRate: 0.25 }
  },
  {
    Icon: Rocket,
    id: "augment-discount",
    type: "etc",
    label: "가속",
    summary: "다음 증강을 얻는 데 필요한 점수가 레벨당 10% 줄어듭니다.",
    numbers: { augmentDiscountMax: 0.9, augmentDiscountPerLevel: 0.1 }
  }
];

function numberFor(id: AugmentId, key: AugmentNumberKey): number {
  const value = AUGMENT_DEFINITIONS.find((augment) => augment.id === id)?.numbers?.[key];
  if (value === undefined) throw new Error(`Missing augment number: ${id}.${key}`);
  return value;
}

export const AUGMENT_IDS = AUGMENT_DEFINITIONS.map(({ id }) => id);

// Human-readable label for each augment category.
export const AUGMENT_TYPE_LABEL: Record<AugmentType, string> = {
  combo: "콤보형",
  item: "아이템형",
  clear: "줄 제거형",
  multiline: "멀티라인형",
  placement: "안정 배치형",
  etc: "기타"
};

export const AUGMENT_MAX_LEVELS: Partial<Record<AugmentId, number>> = Object.fromEntries(
  AUGMENT_DEFINITIONS
    .filter((augment) => augment.maxLevel !== undefined)
    .map((augment) => [augment.id, augment.maxLevel])
);

export const augmentDetails: AugmentDetail[] = AUGMENT_DEFINITIONS;

export const PLACEMENT_MULT_PER_LEVEL = numberFor("placement-score", "placementMultPerLevel");
export const CELL_PLACEMENT_BONUS = numberFor("cell-placement-bonus", "cellPlacementBonus");
export const SPREAD_FILL_CHANCE_PER_LEVEL = numberFor("spread-fill", "spreadFillChancePerLevel");
export const ALL_CLEAR_SCORE_BONUS = numberFor("all-clear", "allClearScoreBonus");
export const CLEAR_MULT_PER_LEVEL = numberFor("clear-score", "clearMultPerLevel");
export const CELL_CLEAR_BONUS = numberFor("cell-clear-bonus", "cellClearBonus");
export const SPREAD_CLEAR_CHANCE_PER_LEVEL = numberFor("spread-clear", "spreadClearChancePerLevel");
export const CRACK_CLEAR_BONUS = numberFor("crack-clear", "crackClearBonus");
export const COMBO_BASE_BONUS = numberFor("tray-combo", "comboBaseBonus");
export const COMBO_CLEAR_SCORE_BONUS = numberFor("tray-combo", "comboClearScoreBonus");
export const COMBO_ACCEL_PER_COMBO = numberFor("combo-accel", "comboAccelPerCombo");
export const COMBO_CORRECTION_MAX = numberFor("combo-correction", "comboCorrectionMax");
export const COMBO_CORRECTION_PER_LEVEL = numberFor("combo-correction", "comboCorrectionPerLevel");
export const MULTI_LINE_BASE_BONUS = numberFor("multi-line", "multiLineBaseBonus");
export const MULTI_LINE_SCORE_BONUS = numberFor("multi-line", "multiLineScoreBonus");
export const BOARD_PRESSURE_SCORE_BONUS = numberFor("board-pressure", "boardPressureScoreBonus");
export const BOARD_PRESSURE_THRESHOLD = numberFor("board-pressure", "boardPressureThreshold");
export const OVERHEAT_BONUS = numberFor("overheat", "overheatBonus");
export const REROLL_MAX_LEVEL = AUGMENT_MAX_LEVELS["reroll-power"] ?? 0;
export const ITEM_DISCOUNT_PER_LEVEL = numberFor("item-discount", "itemDiscountPerLevel");
export const ITEM_GAIN_SCORE_BONUS = numberFor("item-gain-score", "itemGainScoreBonus");
export const ITEM_USE_SCORE_BONUS = numberFor("item-use-score", "itemUseScoreBonus");
export const ITEM_CHAIN_RATE = numberFor("item-chain", "itemChainRate");
export const AUGMENT_DISCOUNT_MAX = numberFor("augment-discount", "augmentDiscountMax");
export const AUGMENT_DISCOUNT_PER_LEVEL = numberFor("augment-discount", "augmentDiscountPerLevel");
