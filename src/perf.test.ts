import { describe, expect, it } from "vitest";
import {
  cachePixelRatioForScale,
  displayPixelRatio,
  isHandheld,
  stableProps,
  structurallyEqual,
} from "./perf";

describe("structurallyEqual", () => {
  it("treats equal shapes with different identities as unchanged", () => {
    const a = { name: "Bloom", pages: [{ id: "1", objects: [{ x: 1 }] }] };
    const b = JSON.parse(JSON.stringify(a));
    expect(structurallyEqual(a, b)).toBe(true);
  });

  it("detects changed primitives, keys and nested values", () => {
    expect(structurallyEqual({ x: 1 }, { x: 2 })).toBe(false);
    expect(structurallyEqual({ x: 1 }, { x: 1, y: undefined })).toBe(false);
    expect(structurallyEqual({ x: { y: [1, 2] } }, { x: { y: [2, 1] } })).toBe(
      false,
    );
    expect(structurallyEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  it("distinguishes null, undefined, arrays and plain values", () => {
    expect(structurallyEqual(undefined, null)).toBe(false);
    expect(structurallyEqual([], {})).toBe(false);
    expect(structurallyEqual(null, null)).toBe(true);
    expect(structurallyEqual(0, false)).toBe(false);
  });

  it("shares identity fast paths for untouched branches", () => {
    const object = { id: "o-1", text: "hello" };
    const page = { id: "p-1", objects: [object] };
    const next = { ...page, objects: [object] };
    expect(structurallyEqual(page, next)).toBe(true);
  });
});

describe("canvas pixel ratios", () => {
  it("never caches above 2x and never below 1x", () => {
    expect(cachePixelRatioForScale(0.32)).toBe(1);
    expect(cachePixelRatioForScale(1)).toBe(1);
    expect(cachePixelRatioForScale(2)).toBe(2);
    expect(cachePixelRatioForScale(0)).toBe(1);
    expect(cachePixelRatioForScale(Number.NaN)).toBe(1);
  });

  it("treats node-less environments as desktop", () => {
    expect(displayPixelRatio()).toBe(1);
    expect(isHandheld()).toBe(false);
  });
});

describe("stableProps", () => {
  it("ignores callback identity but compares data", () => {
    const page = { id: "p" };
    const a = { page, onAdd: () => 1 };
    const b = { page, onAdd: () => 2 };
    expect(stableProps(a, b)).toBe(true);
    expect(stableProps(a, { ...b, page: { id: "q" } })).toBe(false);
  });
});
