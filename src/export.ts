/**
 * Rules for rasterising a page into a downloadable file.
 *
 * Exporting used to be a single `stage.toDataURL()` call with a pixel ratio
 * derived from the zoom level. That is fine on a desktop test browser, but on
 * phones and tablets the pages that are off-screen are not mounted, and the
 * browser silently refuses to allocate a canvas that is too large (returning
 * the useless string `data:,`). The helpers here keep the maths — how big the
 * raster may be, whether the result is a real picture, what to call the file
 * and what to tell the user when something goes wrong — pure and unit tested.
 */

/**
 * Canvas area a browser is expected to rasterise. Safari's limit is the
 * strictest of the common engines, and every Play Store preset fits inside it
 * with room to spare (a 1600×2560 tablet page is 4.1 M pixels).
 */
export const MAX_EXPORT_PIXELS = 16_777_216;

/** Maximum width/height of one canvas side on the strictest engines. */
export const MAX_EXPORT_SIDE = 8192;

/**
 * `pixelRatio` that makes Konva paint a page at its own pixel size.
 *
 * Konva scales the *stage* (which is already zoomed), so `1 / scale` is the
 * full-resolution ratio and anything smaller is a compromise. Oversized pages
 * are reduced instead of failing: a 8000 px canvas cannot be rasterised at
 * 100 % on most devices, and a slightly smaller picture beats an error.
 */
export function exportPixelRatio(width: number, height: number, scale: number) {
  const zoom = scale > 0 ? scale : 1;
  const full = 1 / zoom;
  // The raster is the stage size (page × zoom) times the ratio, so it lands on
  // the page's own pixels whatever the zoom is — and the browser's limits
  // apply to those pixels. The small margin keeps a giant canvas safely
  // inside the limit instead of one pixel over it.
  const needed = Math.max(
    1,
    Math.sqrt((width * height) / MAX_EXPORT_PIXELS),
    Math.max(width, height) / MAX_EXPORT_SIDE,
  );
  // The small margin keeps a giant canvas safely inside the limit instead of
  // one pixel over it; pages that already fit are never resampled.
  const shrink = needed > 1 ? needed * 1.02 : 1;
  return { ratio: full / shrink, reduced: shrink > 1 };
}

/**
 * Whether a data URL holds a picture.
 *
 * A canvas the browser could not allocate comes back as `"data:,"` or as an
 * empty string instead of throwing, which is how a failed export used to look
 * like a successful one.
 */
export function isUsableImageUrl(url: string) {
  if (!url.startsWith("data:image/")) return false;
  const comma = url.indexOf(",");
  return comma > 0 && url.length - comma > 100;
}

/** File name for one exported page, e.g. `01-Welcome.png`. */
export function screenshotFilename(
  index: number,
  name: string,
  format: "png" | "jpeg",
) {
  // Marks are letters too: Bengali and Devanagari vowel signs sit in the
  // `\p{M}` category, and dropping them turned "বাংলা পাতা" into "বল পত".
  const clean = name.replace(/[^\p{L}\p{M}\p{N} -]/gu, "").trim() || "Page";
  return `${String(index + 1).padStart(2, "0")}-${clean}.${format === "png" ? "png" : "jpg"}`;
}

/** One short sentence for the toast, keeping the useful part of a failure. */
export function exportErrorReason(error: unknown) {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).trim();
  if (/taint|security/i.test(message))
    return "a picture on this page comes from outside the editor";
  if (/memory|allocat/i.test(message))
    return "the browser ran out of memory for a canvas this size";
  if (/not ready|timed out|timeout/i.test(message))
    return "the page did not finish drawing in time";
  return message || "something went wrong";
}
