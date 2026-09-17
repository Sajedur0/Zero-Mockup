import { describe, expect, it } from "vitest";
import {
  MAX_EXPORT_PIXELS,
  MAX_EXPORT_SIDE,
  exportErrorReason,
  exportPixelRatio,
  isUsableImageUrl,
  screenshotFilename,
} from "./export";

/**
 * Output raster size for a page exported at a given zoom level. The stage is
 * `page × zoom` on screen and Konva multiplies that by the pixel ratio.
 */
const raster = (width: number, height: number, scale: number) => {
  const { ratio } = exportPixelRatio(width, height, scale);
  return { width: width * scale * ratio, height: height * scale * ratio };
};

describe("exportPixelRatio", () => {
  it("renders a Play Store page at its own pixel size", () => {
    // Konva scales the stage, so the ratio undoes the zoom exactly.
    const { ratio, reduced } = exportPixelRatio(1080, 1920, 346 / 1080);
    expect(reduced).toBe(false);
    expect(ratio).toBeCloseTo(1080 / 346, 6);
    expect(raster(1080, 1920, 346 / 1080).width).toBeCloseTo(1080, 6);
    expect(raster(1080, 1920, 346 / 1080).height).toBeCloseTo(1920, 6);
  });

  it("keeps every preset inside the canvas limits", () => {
    for (const [width, height] of [
      [1080, 1920],
      [1080, 2340],
      [1200, 1920],
      [1600, 2560],
      [1024, 500],
      [512, 512],
    ]) {
      const { ratio, reduced } = exportPixelRatio(width, height, 0.28);
      expect(reduced).toBe(false);
      const size = raster(width, height, 0.28);
      expect(size.width).toBeCloseTo(width, 6);
      expect(size.height).toBeCloseTo(height, 6);
      expect(size.width * size.height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
      expect(ratio).toBeGreaterThan(0);
    }
  });

  it("shrinks an oversized canvas instead of asking for the impossible", () => {
    const size = raster(8000, 8000, 0.05);
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS + 1);
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(
      MAX_EXPORT_SIDE + 1,
    );
    expect(exportPixelRatio(8000, 8000, 0.05).reduced).toBe(true);
  });

  it("treats a missing or silly zoom level as 1:1", () => {
    expect(exportPixelRatio(1080, 1920, 0).ratio).toBe(1);
    expect(exportPixelRatio(1080, 1920, Number.NaN).ratio).toBe(1);
  });
});

describe("isUsableImageUrl", () => {
  it("rejects the empty results a refused canvas produces", () => {
    expect(isUsableImageUrl("")).toBe(false);
    expect(isUsableImageUrl("data:,")).toBe(false);
    expect(isUsableImageUrl("data:image/png;base64,")).toBe(false);
    expect(isUsableImageUrl("https://example.com/picture.png")).toBe(false);
  });

  it("accepts real PNG and JPEG data URLs", () => {
    expect(isUsableImageUrl("data:image/png;base64," + "A".repeat(400))).toBe(
      true,
    );
    expect(isUsableImageUrl("data:image/jpeg;base64," + "B".repeat(400))).toBe(
      true,
    );
  });
});

describe("screenshotFilename", () => {
  it("numbers the pages and keeps real letters", () => {
    expect(screenshotFilename(0, "Welcome", "png")).toBe("01-Welcome.png");
    expect(screenshotFilename(9, "Habit tracker", "jpeg")).toBe(
      "10-Habit tracker.jpg",
    );
    expect(screenshotFilename(1, "বাংলা পাতা", "png")).toBe(
      "02-বাংলা পাতা.png",
    );
  });

  it("strips characters a file system may not like", () => {
    expect(screenshotFilename(0, "Bloom — Play:Store?", "png")).toBe(
      "01-Bloom  PlayStore.png",
    );
    expect(screenshotFilename(0, "", "png")).toBe("01-Page.png");
  });
});

describe("exportErrorReason", () => {
  it("turns the usual browser failures into readable words", () => {
    expect(
      exportErrorReason(new Error("Tainted canvases may not be exported")),
    ).toBe("a picture on this page comes from outside the editor");
    expect(exportErrorReason(new Error("Failed to allocate canvas"))).toBe(
      "the browser ran out of memory for a canvas this size",
    );
    expect(exportErrorReason(new Error("Page is not ready"))).toBe(
      "the page did not finish drawing in time",
    );
  });

  it("keeps an unexpected message and never returns nothing", () => {
    expect(exportErrorReason(new Error("Cannot read properties of null"))).toBe(
      "Cannot read properties of null",
    );
    expect(exportErrorReason(new Error(""))).toBe("something went wrong");
    expect(exportErrorReason(undefined)).toBe("undefined");
  });
});
