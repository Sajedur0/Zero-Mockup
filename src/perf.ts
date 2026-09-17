/**
 * Shared performance helpers.
 *
 * Everything in here exists to keep the editor responsive on phones and
 * tablets, where large PNG/JPG data URLs and 3x device pixel ratios can
 * otherwise allocate hundreds of megabytes of canvas memory. Nothing in this
 * module touches Konva, so it stays cheap to import and easy to unit test.
 */

let coarsePointer: boolean | null = null;

/** `(pointer: coarse)` never changes during a session, so cache the lookup. */
export function isCoarsePointer() {
  if (coarsePointer === null) {
    try {
      coarsePointer =
        typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)")?.matches === true;
    } catch {
      coarsePointer = false;
    }
  }
  return coarsePointer;
}

/** Touch-first devices: coarse pointer or a narrow (mobile/tablet) viewport. */
export function isHandheld() {
  if (typeof window === "undefined") return false;
  return isCoarsePointer() || window.innerWidth < 1024;
}

export function devicePixelRatioValue() {
  if (typeof window === "undefined") return 1;
  return Math.max(1, window.devicePixelRatio || 1);
}

/**
 * Skinny canvas scale for on-screen drawing. Retina phones report 3 (and
 * higher) device pixels per CSS pixel; drawing Konva layers at that ratio
 * triples the pixels filled on every redraw for a barely visible sharpness
 * gain. Exports are re-rendered from the scene graph at full resolution, so
 * capping this only affects the live preview.
 */
export function displayPixelRatio() {
  const dpr = devicePixelRatioValue();
  return isHandheld() ? Math.min(2, dpr) : Math.min(3, dpr);
}

/**
 * Resolution of a cached canvas, matched to how large the node is drawn.
 *
 * Konva `cache()` allocates up to three canvases per node; on a 3x phone a
 * single 745x1510 device screen needed roughly 80 MB of canvas memory, and
 * the default project cached three of them.
 */
export function cachePixelRatioForScale(scale: number) {
  const dpr = devicePixelRatioValue();
  return Math.min(2, Math.max(1, Math.round(Math.abs(scale || 1) * dpr)));
}

/** Run `task` when the browser is idle, falling back to a short timeout. */
export function onIdle(task: () => void, timeout = 200) {
  const win = window as Window & {
    requestIdleCallback?: (
      cb: () => void,
      options?: { timeout: number },
    ) => number;
  };
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(task, { timeout });
    return;
  }
  window.setTimeout(task, 0);
}

/** Coalesce bursts of pointer/touch events into one update per frame. */
export function rafThrottle<T extends (...args: never[]) => void>(fn: T) {
  let frame = 0;
  let lastArgs: unknown[] = [];
  const invoke = () => {
    frame = 0;
    fn(...(lastArgs as never[]));
  };
  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (frame) return;
    frame = requestAnimationFrame(invoke);
  };
}

/**
 * `React.memo` comparison that ignores callback identity.
 *
 * The editor passes freshly-created handlers to its panels on every render,
 * which would otherwise re-render hundreds of form fields on every frame of
 * a pinch gesture. Skipping is only safe because every value those handlers
 * read is also passed to the panel as a prop, so a data change still
 * re-renders and hands over fresh callbacks.
 */
export function stableProps<P extends object>(a: P, b: P) {
  for (const key of Object.keys(a) as (keyof P)[]) {
    if (typeof a[key] === "function") continue;
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Cheap structural comparison used to drop no-op project updates.
 *
 * `JSON.stringify(old) === JSON.stringify(next)` used to run twice on every
 * keystroke and every slider tick, which meant building multi-megabyte
 * strings whenever the project held a screenshot. Updates are immutable, so
 * unchanged branches keep their identity and this walk stops at the first
 * difference.
 */
export function structurallyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!structurallyEqual(left[key], right[key])) return false;
  }
  return true;
}

const requestedFonts = new Set<string>();

export type FontNeed = string | { spec: string; sample?: string };

/**
 * Fetch font faces that are not on the critical path, in the background, and
 * tell the Konva canvases to re-measure their text once they arrive.
 *
 * `sample` restricts the download to the faces that cover those characters,
 * so a Bengali face is only fetched when the project actually has Bengali
 * text.
 */
export function requestFonts(needs: FontNeed[]) {
  if (typeof window === "undefined" || !document.fonts) return;
  const pending: { spec: string; sample?: string }[] = [];
  for (const need of needs) {
    const { spec, sample } =
      typeof need === "string" ? { spec: need, sample: undefined } : need;
    const key = spec + "\u0000" + (sample || "");
    if (requestedFonts.has(key)) continue;
    requestedFonts.add(key);
    pending.push({ spec, sample });
  }
  if (!pending.length) return;
  Promise.allSettled(
    pending.map(({ spec, sample }) =>
      sample ? document.fonts.load(spec, sample) : document.fonts.load(spec),
    ),
  )
    .then(() => document.fonts.ready)
    .catch(() => {})
    .then(() => window.dispatchEvent(new Event("zero:fonts-updated")));
}
