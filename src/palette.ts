/**
 * Colour sampling for uploaded pictures.
 *
 * A page background should look like it belongs to the artwork on top of it,
 * so the inspector lets a picture *suggest* the palette: the dominant areas
 * become solid colours and two or three of them are blended into ready-made
 * gradients.
 *
 * The sampling code is split from the drawing code on purpose — everything
 * below `paletteFromBuckets` is pure maths and is unit tested, while
 * `sampleImagePalette` is the only part that touches a canvas.
 */

/** One cell of the RGB histogram: the mean colour of a region + its area. */
export type ColorBucket = { r: number; g: number; b: number; count: number };
export type GradientRecipe = {
  name: string;
  colors: string[];
  type: "linear" | "radial";
  angle: number;
};
export type SampledPalette = {
  /** Solid colours, most-covered area first. */
  swatches: string[];
  /** Ready-made gradients built from those colours. */
  gradients: GradientRecipe[];
  /** Mean colour of the whole picture, useful as a fallback. */
  average: string;
};

/** Histogram cell size in RGB space. 24 keeps JPEG noise in one bucket. */
export const COLOR_MODULE = 24;

/**
 * The picture is measured through a temporary canvas no larger than this.
 * Sampling a 4000 px screenshot at full size would block the main thread for
 * no extra accuracy.
 */
export const ANALYSIS_BUDGET = 120;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function toHex(r: number, g: number, b: number) {
  const part = (v: number) =>
    Math.round(clamp(v, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return "#" + part(r) + part(g) + part(b);
}

export function parseHex(color: string) {
  const hex = color.replace("#", "");
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

/** `t` of the way from `color` towards `towards` (used for tint and shade). */
function mix(color: string, towards: string, t: number) {
  const a = parseHex(color),
    b = parseHex(towards),
    k = clamp(t, 0, 1);
  return toHex(
    a.r + (b.r - a.r) * k,
    a.g + (b.g - a.g) * k,
    a.b + (b.b - a.b) * k,
  );
}

/** Lighter version of a colour — photo backgrounds on white pages. */
export function tint(color: string, t: number) {
  return mix(color, "#ffffff", t);
}

/** Darker version of a colour — gradient ends and text-safe backgrounds. */
export function shade(color: string, t: number) {
  return mix(color, "#000000", t);
}

/** Perceptual-ish luma, 0 (black) … 255 (white). */
export function luma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Luma of a `#rrggbb` colour. */
export function lumaOf(color: string) {
  const { r, g, b } = parseHex(color);
  return luma(r, g, b);
}

/** Saturation of a colour, 0 (grey) … 1 (vivid). */
export function saturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Saturation of a `#rrggbb` colour. */
export function saturationOf(color: string) {
  const { r, g, b } = parseHex(color);
  return saturation(r, g, b);
}

/** Distance in RGB space, used to keep the palette from repeating itself. */
export function colorDistance(a: string, b: string) {
  const x = parseHex(a),
    y = parseHex(b);
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b);
}

/**
 * Group the pixels of a drawing into mean-colour buckets.
 *
 * Only the *key* is quantised: each bucket keeps the average of the pixels
 * that fell into it, so a flat #ff8855 region is reported as exactly
 * #ff8855 rather than the centre of its 24-pixel cube. Fully transparent
 * pixels are skipped — they do not paint anything.
 */
export function bucketsFromPixels(
  data: Uint8ClampedArray,
  module = COLOR_MODULE,
): ColorBucket[] {
  const step = Math.max(1, module);
  const buckets = new Map<
    number,
    { r: number; g: number; b: number; count: number }
  >();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 125) continue;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const key =
      (Math.round(r / step) << 16) |
      (Math.round(g / step) << 8) |
      Math.round(b / step);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else buckets.set(key, { r, g, b, count: 1 });
  }
  return [...buckets.values()].map((bucket) => ({
    r: bucket.r / bucket.count,
    g: bucket.g / bucket.count,
    b: bucket.b / bucket.count,
    count: bucket.count,
  }));
}

/**
 * How much a bucket deserves a place in the palette.
 *
 * Area matters most, but a vivid colour from a small logo should still be
 * offered next to a large flat wall — hence the square root (diminishing
 * returns on area) and the saturation/contrast reward.
 */
export function bucketScore(bucket: ColorBucket) {
  const sat = saturation(bucket.r, bucket.g, bucket.b);
  const contrast = Math.abs(luma(bucket.r, bucket.g, bucket.b) - 128) / 128;
  return (
    Math.sqrt(sat + 0.04) * (0.4 + 0.6 * contrast) * Math.pow(bucket.count, 0.6)
  );
}

/** Walk `buckets` and keep the first `limit` that are far enough apart. */
function distinct(buckets: ColorBucket[], limit: number, gap = 64) {
  const chosen: ColorBucket[] = [];
  for (const bucket of buckets) {
    const color = toHex(bucket.r, bucket.g, bucket.b);
    if (chosen.every((c) => colorDistance(toHex(c.r, c.g, c.b), color) >= gap))
      chosen.push(bucket);
    if (chosen.length === limit) break;
  }
  return chosen;
}

/** Two stops that are visible: never the same colour twice. */
function stops(a: string, b: string, gap = 30): string[] {
  if (colorDistance(a, b) >= gap) return [a, b];
  return [a, lumaOf(a) > 140 ? shade(a, 0.35) : tint(a, 0.45)];
}

/**
 * Turn a histogram into the palette the inspector offers: solid swatches
 * (largest area first) and gradients built from them.
 */
export function paletteFromBuckets(
  buckets: ColorBucket[],
  options?: { gradientCount?: number },
): SampledPalette {
  const usable = buckets.filter((bucket) => bucket.count > 0);
  const total = usable.reduce((sum, bucket) => sum + bucket.count, 0);
  if (!usable.length || total === 0)
    return { swatches: [], gradients: [], average: "#ffffff" };

  const byArea = [...usable].sort((a, b) => b.count - a.count);
  const byScore = [...usable].sort((a, b) => bucketScore(b) - bucketScore(a));
  const average = toHex(
    usable.reduce((sum, b) => sum + b.r * b.count, 0) / total,
    usable.reduce((sum, b) => sum + b.g * b.count, 0) / total,
    usable.reduce((sum, b) => sum + b.b * b.count, 0) / total,
  );

  // Alternate "what covers the page" with "what catches the eye" so the row
  // is not six shades of the same wall. The first pick is always the largest
  // area, which is what the soft gradient is built from.
  const areaPicks = distinct(byArea, 4);
  const vividPicks = distinct(byScore, 3).filter(
    (bucket) => !areaPicks.includes(bucket),
  );
  const shortlist: ColorBucket[] = [];
  for (let i = 0; i < Math.max(areaPicks.length, vividPicks.length); i++) {
    if (areaPicks[i]) shortlist.push(areaPicks[i]);
    if (vividPicks[i]) shortlist.push(vividPicks[i]);
  }
  if (!shortlist.length) shortlist.push(...byArea);

  const swatches: string[] = [];
  for (const bucket of shortlist) {
    const color = toHex(bucket.r, bucket.g, bucket.b);
    if (swatches.every((c) => colorDistance(c, color) >= 40))
      swatches.push(color);
    if (swatches.length === 6) break;
  }
  // A flat logo or a one-colour PNG: derive the neighbours from the mean so
  // gradients still work.
  if (swatches.length === 1) {
    swatches.push(tint(swatches[0], 0.62), shade(swatches[0], 0.35));
  }
  const [first, second = tint(first, 0.5)] = swatches;
  /**
   * A near-white leading colour — paper, a bright wall — cannot be deepened:
   * shading it only produces grey, which is exactly what a photo-inspired
   * gradient should not be. A real colour from the picture takes its place.
   */
  const deep =
    lumaOf(first) > 205
      ? lumaOf(second) <= 205
        ? second
        : shade(first, 0.3)
      : first;
  const bySaturation = [...swatches].sort(
    (a, b) => saturationOf(b) - saturationOf(a),
  );
  /** The picture's most colourful area. */
  const vivid = bySaturation[0] ?? deep;
  /** A pale wash of the vivid colour, used when a gradient needs lifting. */
  const light = lumaOf(vivid) > 205 ? shade(vivid, 0.3) : tint(vivid, 0.78);
  /** The next most colourful area, far enough away to be worth blending. */
  const accent =
    bySaturation.slice(1).find((color) => colorDistance(color, vivid) >= 90) ??
    light;
  /** `b`, or a safe alternative when `b` is too close to `a` to be seen. */
  const contrast = (a: string, b: string, gap = 60) =>
    colorDistance(a, b) >= gap ? b : light;
  const gradients: GradientRecipe[] = (
    [
      {
        // A pale wash of the leading colour towards the colour itself.
        name: "Photo · soft",
        colors: stops(tint(deep, 0.8), deep),
        type: "linear",
        angle: 135,
      },
      {
        // Deep and punchy: for pages where white text has to stay readable.
        name: "Photo · bold",
        colors: stops(shade(deep, 0.42), contrast(deep, vivid)),
        type: "linear",
        angle: 145,
      },
      {
        // A glow of the picture's most colourful area.
        name: "Photo · glow",
        colors: stops(tint(vivid, 0.7), deep),
        type: "radial",
        angle: 0,
      },
      {
        // The picture's two most colourful areas, one above the other.
        name: "Photo · duo",
        colors: stops(vivid, contrast(vivid, accent, 90)),
        type: "linear",
        angle: 45,
      },
    ] as GradientRecipe[]
  ).slice(0, options?.gradientCount ?? 4);
  return { swatches, gradients, average };
}

/**
 * Size of the working canvas used to measure a picture.
 *
 * The picture is drawn stretched to the page's aspect ratio, exactly how the
 * editor paints it as a background, so a band that will end up 2 % of the
 * page does not get counted as 20 %. Keeping one side at the budget also
 * keeps this cheap: a 9:19.5 phone page is measured with ~25 000 pixels.
 */
export function analysisSize(
  width: number,
  height: number,
  pageAspect = 1,
  budget = ANALYSIS_BUDGET,
) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const aspect = clamp(pageAspect || 1, 0.2, 5);
  let w = Math.min(safeWidth, budget);
  let h = Math.max(1, Math.round(w / aspect));
  // Never blow a small picture up: when the page shape needs more rows than
  // the source has, both sides come down together.
  if (h > safeHeight) {
    w = Math.max(1, Math.round((w * safeHeight) / h));
    h = safeHeight;
  }
  return { w, h };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be opened."));
    image.src = src;
  });
}

/**
 * Small cache of finished palettes.
 *
 * The inspector mounts and unmounts as the selection changes, and pages are
 * resized a lot; re-reading the same multi-megabyte data URL each time would
 * be wasteful. Entries compare by identity, so no big strings are copied.
 */
const cachedPalettes: {
  src: string;
  aspect: number;
  palette: SampledPalette;
}[] = [];
const CACHE_LIMIT = 4;

export function cachedPalette(src: string, aspect: number) {
  const hit = cachedPalettes.find(
    (entry) => entry.src === src && Math.abs(entry.aspect - aspect) < 0.02,
  );
  return hit?.palette;
}

export function rememberPalette(
  src: string,
  aspect: number,
  palette: SampledPalette,
) {
  cachedPalettes.unshift({ src, aspect, palette });
  cachedPalettes.length = Math.min(cachedPalettes.length, CACHE_LIMIT);
}

/**
 * Sample a picture (usually a data URL from the upload button) into colours.
 * Rejects when the picture cannot be read or holds nothing but transparency.
 */
export async function sampleImagePalette(
  src: string,
  pageAspect = 1,
): Promise<SampledPalette> {
  const cached = cachedPalette(src, pageAspect);
  if (cached) return cached;
  const image = await loadImage(src);
  if (!image.width || !image.height) throw new Error("This image is empty.");
  const { w, h } = analysisSize(image.width, image.height, pageAspect);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This image could not be measured.");
  ctx.drawImage(image, 0, 0, w, h);
  // A remote picture would taint the canvas; uploads are always data URLs.
  const { data } = ctx.getImageData(0, 0, w, h);
  const palette = paletteFromBuckets(bucketsFromPixels(data));
  if (!palette.swatches.length)
    throw new Error("This image has no colours to sample.");
  rememberPalette(src, pageAspect, palette);
  return palette;
}
