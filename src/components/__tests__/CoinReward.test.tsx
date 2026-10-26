import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CoinReward from "../CoinReward";

describe("coin reward display", () => {
  it("renders only the coin icon and formatted amount without game-over content", () => {
    const markup = renderToStaticMarkup(<CoinReward amount={1234} />);

    expect(markup).toContain("+1,234");
    expect(markup).toContain("<svg");
    expect(markup).toContain('aria-label="획득 코인 1,234"');
    expect(markup).not.toMatch(/<(?:p|button|h2)(?:\s|>)|Game Over|Score|정산/);
  });

  it("displays a confirmed zero reward", () => {
    const markup = renderToStaticMarkup(<CoinReward amount={0} />);

    expect(markup).toContain("+0");
    expect(markup).toContain('aria-label="획득 코인 0"');
  });

  it("does not present invalid amounts as earned coins", () => {
    for (const amount of [
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(renderToStaticMarkup(<CoinReward amount={amount} />)).toBe("");
    }
  });

  it("accepts the host screen's class, styles and icon size", () => {
    const markup = renderToStaticMarkup(
      <CoinReward
        amount={60}
        className="hard-mode-reward"
        style={{ color: "purple", fontSize: 40 }}
        iconSize={32}
      />,
    );

    expect(markup).toContain('class="coin-reward hard-mode-reward"');
    expect(markup).toContain("color:purple;font-size:40px");
    expect(markup).toContain('width="32"');
  });
});
