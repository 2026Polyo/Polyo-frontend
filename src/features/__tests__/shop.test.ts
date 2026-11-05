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
    const empty = await getPreviewThemes(data.totalPages + 1, "name,asc");
    expect(empty.data.items).toEqual([]);
    expect(empty.data.totalElements).toBe(data.totalElements);
    const pages = await Promise.all(
      Array.from({ length: data.totalPages }, (_, index) =>
        getPreviewThemes(index + 1, "name,asc"),
      ),
    );
    const all = pages.flatMap(({ data: page }) => page.items);
    expect(all).toHaveLength(data.totalElements);
    expect(new Set(all.map((theme) => theme.themeId)).size).toBe(all.length);
    expect(all.map((theme) => theme.themeId).sort()).toEqual([
      "theme_cat",
      "theme_jelly",
      "theme_minecraft",
      "theme_neon",
    ]);
  });
  it("rejects invalid query conditions", async () => {
    await expect(getPreviewThemes(0, "name,asc")).rejects.toThrow();
    await expect(getPreviewThemes(1, "unknown,asc")).rejects.toThrow();
  });
  it("shows a disclosed fallback for unknown and prototype-like server theme IDs", () => {
    for (const id of [
      "unknown-server-theme",
      "__proto__",
      "constructor",
      "toString",
    ]) {
      const presentation = getThemePresentation(id);
      expect(presentation.description).toContain("기본 블록");
      expect(presentation.colors).toHaveLength(5);
    }
  });
});
