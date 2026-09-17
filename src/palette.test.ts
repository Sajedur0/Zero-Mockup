import { describe, expect, it } from "vitest";
import {
  analysisSize,
  bucketsFromPixels,
  cachedPalette,
  colorDistance,
  paletteFromBuckets,
  parseHex,
  rememberPalette,
  sampleImagePalette,
  shade,
  tint,
  toHex,
  type ColorBucket,
} from "./palette";

/** Build a pixel buffer from flat colour spans, in order. */
function pixels(spans: [number, number, number, number][]) {
  const out = new Uint8ClampedArray(
    spans.flatMap(([r, g, b, n]) =>
      Array.from({ length: n }, () => [r, g, b, 255]).flat(),
    ),
  );
  return out;
}

describe("bucketsFromPixels", () => {
  it("averages the real pixels of a bucket instead of its grid centre", () => {
    const [bucket] = bucketsFromPixels(pixels([[255, 136, 85, 400]]));
    expect(bucket.count).toBe(400);
    // The grid cell is 24 wide; the reported colour is the true mean.
    expect(toHex(bucket.r, bucket.g, bucket.b)).toBe("#ff8855");
  });

  it("keeps JPEG-style noise in one bucket", () => {
    const noisy = new Uint8ClampedArray(
      Array.from({ length: 200 }, (_, i) => [
        200 + (i % 5) - 2,
        30 + (i % 3) - 1,
        40,
        255,
      ]).flat(),
    );
    const buckets = bucketsFromPixels(noisy);
    expect(buckets).toHaveLength(1);
    expect(Math.abs(buckets[0].r - 200)).toBeLessThan(3);
  });

  it("ignores fully transparent pixels", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 0]);
    const buckets = bucketsFromPixels(data);
    expect(buckets).toHaveLength(1);
    expect(toHex(buckets[0].r, buckets[0].g, buckets[0].b)).toBe("#ff0000");
  });
});

describe("paletteFromBuckets", () => {
  const twoTone: ColorBucket[] = [
    { r: 40, g: 78, b: 59, count: 800 }, // large dark green area
    { r: 247, g: 230, b: 219, count: 200 }, // smaller cream area
  ];

  it("offers the largest area first, then the vivid colour", () => {
    const { swatches } = paletteFromBuckets(twoTone);
    expect(swatches[0]).toBe("#284e3b");
    expect(swatches).toContain("#f7e6db");
  });

  it("builds usable gradients out of the sampled colours", () => {
    const { gradients } = paletteFromBuckets(twoTone);
    expect(gradients).toHaveLength(4);
    for (const gradient of gradients) {
      expect(["linear", "radial"]).toContain(gradient.type);
      expect(gradient.colors.length).toBeGreaterThanOrEqual(2);
      expect(gradient.colors.length).toBeLessThanOrEqual(6);
      for (const color of gradient.colors)
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      // A gradient with two identical stops would look like a flat fill.
      expect(
        colorDistance(gradient.colors[0], gradient.colors[1]),
      ).toBeGreaterThanOrEqual(30);
    }
  });

  it("stays subtle when the picture is a single flat colour", () => {
    const { swatches, gradients } = paletteFromBuckets([
      { r: 255, g: 136, b: 85, count: 500 },
    ]);
    // Neighbouring tints are derived so a solid fill is still possible.
    expect(swatches[0]).toBe("#ff8855");
    expect(swatches.length).toBeGreaterThan(1);
    expect(colorDistance(swatches[0], swatches[1])).toBeGreaterThan(60);
    expect(gradients[0].colors[1]).toBe("#ff8855");
  });

  it("does not turn a white-led picture into grey gradients", () => {
    // A logo on paper: the paper covers most of the sheet, but every tile has
    // to keep the brand blue instead of fading to grey.
    const { swatches, gradients } = paletteFromBuckets([
      { r: 250, g: 250, b: 248, count: 900 },
      { r: 47, g: 107, b: 255, count: 300 },
    ]);
    expect(swatches[0]).toBe("#fafaf8");
    const bluish = (color: string) => {
      const { r, g, b } = parseHex(color);
      return b > r + 40 && b > g + 40;
    };
    for (const gradient of gradients)
      expect(
        gradient.colors.some(bluish),
        `${gradient.name} lost the picture's colour`,
      ).toBe(true);
  });

  it("keeps white and black artwork from collapsing into one swatch", () => {
    const { swatches } = paletteFromBuckets([
      { r: 255, g: 255, b: 255, count: 400 },
      { r: 0, g: 0, b: 0, count: 300 },
      { r: 233, g: 123, b: 83, count: 120 },
    ]);
    expect(swatches).toHaveLength(3);
    expect(swatches).toContain("#e97b53");
  });

  it("returns nothing for an empty histogram", () => {
    const palette = paletteFromBuckets([]);
    expect(palette.swatches).toEqual([]);
    expect(palette.gradients).toEqual([]);
  });
});

describe("analysisSize", () => {
  it("stretches the picture to the page's aspect ratio inside a budget", () => {
    // A 9:19.5 phone page keeps the picture's bands proportional to the page.
    const phone = analysisSize(2000, 4000, 1080 / 1920);
    expect(phone.w).toBe(120);
    expect(phone.h).toBe(213);
    const landscape = analysisSize(2000, 4000, 1024 / 500);
    expect(landscape.w).toBe(120);
    expect(landscape.h).toBe(59);
    // Never larger than the source, never zero-sized.
    expect(analysisSize(60, 100, 1)).toEqual({ w: 60, h: 60 });
    expect(analysisSize(0, 0, 1).w).toBe(1);
  });
});

describe("colour helpers", () => {
  it("tints, shades and measures distance", () => {
    expect(tint("#000000", 1)).toBe("#ffffff");
    expect(shade("#ffffff", 1)).toBe("#000000");
    expect(tint("#284e3b", 0.5)).toBe("#94a79d");
    expect(colorDistance("#000000", "#ffffff")).toBeCloseTo(441.7, 0);
    expect(colorDistance("#284e3b", "#284e3b")).toBe(0);
  });
});

describe("palette cache", () => {
  it("reuses a palette for the same picture and page shape", () => {
    const palette = paletteFromBuckets([{ r: 1, g: 2, b: 3, count: 10 }]);
    rememberPalette("data:image/png;base64,one", 0.5625, palette);
    expect(cachedPalette("data:image/png;base64,one", 0.5625)).toBe(palette);
    // A different picture, or a page shape that changed meaningfully, is
    // measured again.
    expect(cachedPalette("data:image/png;base64,two", 0.5625)).toBeUndefined();
    expect(cachedPalette("data:image/png;base64,one", 2)).toBeUndefined();
  });
});

describe("sampleImagePalette", () => {
  it("reports a clear error without a browser canvas", async () => {
    // Node has no `document`, so the sampler must fail rather than hang.
    await expect(
      sampleImagePalette("data:image/png;base64,AAAA"),
    ).rejects.toThrow();
  });
});
