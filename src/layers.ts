import type { DesignObject } from "./model";

/**
 * Paint-order moves for the layers panel.
 *
 * A page keeps its objects back-to-front while the panel lists them the other
 * way round, so the frontmost layer sits on top. Every drop in the panel is
 * therefore the same question: does the moved block land above or below the
 * row under the pointer?
 *
 * Both helpers are pure and return the input array untouched when the order
 * would not change, which lets the panel restack live on every row a drag
 * crosses, and lets the keyboard tell "already at the top" from a real move.
 */

/** Where the block sits next to the hovered row, in panel terms. */
export type DropPlace = "above" | "below";

/**
 * Put every layer in `moving` next to the `anchor` row, keeping their relative
 * order so a dragged selection travels as one block.
 */
export function placeBlock(
  objects: DesignObject[],
  moving: string[],
  anchor: string,
  place: DropPlace,
): DesignObject[] {
  const picked = new Set(moving);
  // Hovering a row that is already part of the block is not a move.
  if (!picked.size || picked.has(anchor)) return objects;
  const rest = objects.filter((o) => !picked.has(o.id));
  const at = rest.findIndex((o) => o.id === anchor);
  if (at < 0) return objects;
  const block = objects.filter((o) => picked.has(o.id));
  // One row up in the panel is nearer the front, i.e. one slot later here.
  rest.splice(place === "above" ? at + 1 : at, 0, ...block);
  return rest;
}

/**
 * Step the block one row toward the front (`1`) or the back (`-1`).
 *
 * The scan starts at the edge the block is heading for, so consecutive picked
 * rows swap as a group instead of shuffling past each other.
 */
export function stepBlock(
  objects: DesignObject[],
  moving: string[],
  dir: 1 | -1,
): DesignObject[] {
  const picked = new Set(moving);
  if (!picked.size) return objects;
  const out = [...objects];
  let moved = false;
  const swap = (i: number, j: number) => {
    [out[i], out[j]] = [out[j], out[i]];
    moved = true;
  };
  if (dir === 1) {
    for (let i = out.length - 2; i >= 0; i--)
      if (picked.has(out[i].id) && !picked.has(out[i + 1].id)) swap(i, i + 1);
  } else {
    for (let i = 1; i < out.length; i++)
      if (picked.has(out[i].id) && !picked.has(out[i - 1].id)) swap(i, i - 1);
  }
  return moved ? out : objects;
}
