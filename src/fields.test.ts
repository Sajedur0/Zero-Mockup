import { describe, expect, it } from "vitest";
import {
  commitFieldNumber,
  formatFieldNumber,
  liveFieldNumber,
} from "./fields";

describe("live number fields", () => {
  it("applies a complete, in-range number while it is typed", () => {
    expect(liveFieldNumber("420", 20, 8000)).toBe(420);
    expect(liveFieldNumber(" 84 ", 8, 700)).toBe(84);
    expect(liveFieldNumber("-12.5", -8000, 8000)).toBe(-12.5);
  });

  it("holds back unfinished and out-of-range text", () => {
    // "" and "-" are numbers being typed, not a request to jump to zero.
    expect(liveFieldNumber("", 0, 100)).toBeUndefined();
    expect(liveFieldNumber("   ", 0, 100)).toBeUndefined();
    expect(liveFieldNumber("-", 0, 100)).toBeUndefined();
    expect(liveFieldNumber("1e", 0, 100)).toBeUndefined();
    expect(liveFieldNumber("abc", 0, 100)).toBeUndefined();
    // Out of range waits for the blur, so "150" can be typed into a min-20 box.
    expect(liveFieldNumber("5", 20, 8000)).toBeUndefined();
    expect(liveFieldNumber("9000", 20, 8000)).toBeUndefined();
  });

  it("clamps on blur once the number is complete", () => {
    expect(commitFieldNumber("5", 900, 20, 8000)).toBe(20);
    expect(commitFieldNumber("9000", 900, 20, 8000)).toBe(8000);
    expect(commitFieldNumber("420", 900, 20, 8000)).toBe(420);
    // An empty or unfinished field keeps the object as it is.
    expect(commitFieldNumber("", 900, 20, 8000)).toBe(900);
    expect(commitFieldNumber("-", 900, 20, 8000)).toBe(900);
  });

  it("keeps the two-decimal formatting used on the canvas", () => {
    expect(formatFieldNumber(80.00000000000001)).toBe("80");
    expect(formatFieldNumber(1.25)).toBe("1.25");
    expect(formatFieldNumber(0.5)).toBe("0.5");
  });
});
