/**
 * Rules behind the numeric property fields.
 *
 * The inspector applies every keystroke straight to the canvas instead of
 * waiting for the field to lose focus, so these three helpers decide what a
 * half-typed value means. They live here — free of React and the DOM — so the
 * behaviour can be unit tested.
 */

/** Values are shown with at most two decimals. */
export function formatFieldNumber(value: number) {
  return String(Math.round(value * 100) / 100);
}

/**
 * The number a draft should apply *while it is being typed*, or `undefined`
 * when the canvas should keep its current value.
 *
 * Empty text ("", "-", "1e") is an unfinished number, and anything outside
 * the allowed range is deliberately held back: clamping mid-typing would fight
 * the person typing "150" into a field whose minimum is 20.
 */
export function liveFieldNumber(
  draft: string,
  min: number,
  max: number,
): number | undefined {
  const text = draft.trim();
  if (!text) return undefined;
  const value = Number(text);
  if (!Number.isFinite(value)) return undefined;
  if (value < min || value > max) return undefined;
  return value;
}

/** Range applied when the field is left: blanks and strays fall back. */
export function commitFieldNumber(
  draft: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = liveFieldNumber(draft, min, max);
  if (value !== undefined) return value;
  const text = draft.trim();
  const typed = text ? Number(text) : Number.NaN;
  if (!Number.isFinite(typed)) return fallback;
  return Math.min(max, Math.max(min, typed));
}
