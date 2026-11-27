import { describe, expect, it } from "vitest";
import {
  getNicknameLengthError,
  MAX_NICKNAME_LENGTH,
  MIN_NICKNAME_LENGTH,
} from "../nickname";

describe("nickname validation", () => {
  it("accepts nicknames within the allowed length", () => {
    expect(getNicknameLengthError("가".repeat(MIN_NICKNAME_LENGTH))).toBeNull();
    expect(getNicknameLengthError("가".repeat(MAX_NICKNAME_LENGTH))).toBeNull();
  });

  it("returns the minimum and maximum length message for invalid nicknames", () => {
    const expected = "닉네임은 최소 2자, 최대 20자입니다.";

    expect(getNicknameLengthError("가")).toBe(expected);
    expect(getNicknameLengthError("가".repeat(MAX_NICKNAME_LENGTH + 1))).toBe(
      expected,
    );
  });

  it("ignores surrounding whitespace when validating", () => {
    expect(getNicknameLengthError(" 가나 ")).toBeNull();
  });
});
