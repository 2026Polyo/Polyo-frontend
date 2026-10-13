import { describe, expect, it } from "vitest";
import { chooseAugment, createInitialAugmentState } from "../augments";
import { getItemComboStep, ITEM_COMBO_STEP, ITEM_COMBO_STEP_MIN } from "../items";

describe("getItemComboStep", () => {
  it("uses the base combo interval with no item-discount", () => {
    expect(getItemComboStep(createInitialAugmentState())).toBe(ITEM_COMBO_STEP);
  });

  it("lowers the interval by 2 per item-discount level", () => {
    const state = chooseAugment(createInitialAugmentState(), "item-discount", 0);
    expect(getItemComboStep(state)).toBe(ITEM_COMBO_STEP - 2);
  });

  it("never drops below the floor", () => {
    let state = createInitialAugmentState();
    for (let i = 0; i < 10; i += 1) state = chooseAugment(state, "item-discount", 0);
    expect(getItemComboStep(state)).toBe(ITEM_COMBO_STEP_MIN);
  });
});
