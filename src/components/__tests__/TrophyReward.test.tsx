import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrophyReward } from "../multi";

describe("trophy reward display", () => {
  it("shows the gain and the new total", () => {
    const markup = renderToStaticMarkup(
      <TrophyReward result={{ delta: 1, trophyCount: 1234 }} />,
    );
    expect(markup).toContain("+1");
    expect(markup).toContain("보유 트로피 1,234개");
    expect(markup).toContain(
      'aria-label="트로피 1개 획득, 보유 트로피 1,234개"',
    );
    expect(markup).toContain("<svg");
  });

  it("renders nothing for a result that is not a gain", () => {
    for (const result of [
      { delta: 0, trophyCount: 3 },
      { delta: -1, trophyCount: 3 },
      { delta: 2, trophyCount: 1 },
      { delta: 1.5, trophyCount: 3 },
    ]) {
      expect(renderToStaticMarkup(<TrophyReward result={result} />)).toBe("");
    }
  });
});
