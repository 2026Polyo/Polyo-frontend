import { describe, expect, it } from "vitest";
import { getPreviewThemes } from "../shop";
import { getThemePresentation } from "../themePresentation";

describe("ERD 기반 상점 테마 어댑터", () => {
  it("keeps presentation fields out of the theme DTO", async () => {
    const { data } = await getPreviewThemes(1, "price,asc");
    expect(Object.keys(data.items[0]).sort()).toEqual([
      "name",
      "price",
      "themeId",
    ]);
    expect(
      data.items.every(
        (theme, index) => !index || data.items[index - 1].price <= theme.price,
      ),
    ).toBe(true);
  });
  it("supports descending prices and empty pages", async () => {
    const { data } = await getPreviewThemes(1, "price,desc");
    expect(
      data.items.every(
        (theme, index) => !index || data.items[index - 1].price >= theme.price,
      ),
    ).toBe(true);
    const empty = await getPreviewThemes(2, "name,asc");
    expect(empty.data.items).toEqual([]);
    expect(empty.data.totalElements).toBe(6);
  });
  it("rejects invalid query conditions", async () => {
    await expect(getPreviewThemes(0, "name,asc")).rejects.toThrow();
    await expect(getPreviewThemes(1, "unknown,asc")).rejects.toThrow();
  });
  it("shows a disclosed fallback for a theme without presentation metadata", () => {
    const presentation = getThemePresentation("unknown-server-theme");
    expect(presentation.description).toContain("기본 블록");
    expect(presentation.colors).toHaveLength(5);
  });
});
