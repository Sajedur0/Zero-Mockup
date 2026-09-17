import { describe, expect, it } from "vitest";
import { placeBlock, stepBlock } from "./layers";
import { baseObject, type DesignObject } from "./model";

/** Back-to-front, exactly how a page stores them. */
const stack = (...names: string[]): DesignObject[] =>
  names.map((name) => baseObject("shape", { name, id: name }));

const order = (objects: DesignObject[]) => objects.map((o) => o.name);

describe("placeBlock", () => {
  it("drops a row below the hovered one, as the panel shows it", () => {
    const out = placeBlock(stack("a", "b", "c"), ["c"], "a", "below");
    expect(order(out)).toEqual(["c", "a", "b"]);
  });
  it("drops a row above the hovered one", () => {
    const out = placeBlock(stack("a", "b", "c"), ["a"], "c", "above");
    expect(order(out)).toEqual(["b", "c", "a"]);
  });
  it("moves a selection as one block, keeping its internal order", () => {
    const out = placeBlock(
      stack("a", "b", "c", "d", "e"),
      ["e", "d"],
      "a",
      "below",
    );
    expect(order(out)).toEqual(["d", "e", "a", "b", "c"]);
  });
  it("is a no-op while hovering the dragged row itself", () => {
    const objects = stack("a", "b", "c");
    expect(placeBlock(objects, ["b"], "b", "above")).toBe(objects);
  });
  it("reads a whole drag as the crossings the panel reports, one at a time", () => {
    // The panel never says "move two rows down": the pointer slides over each
    // neighbour in turn, and every step has to leave the row where it shows it.
    let objects = stack("a", "b", "c", "d");
    const panel = () => objects.map((o) => o.name).reverse();
    for (let step = 0; step < 2; step++) {
      const at = panel().indexOf("d");
      objects = placeBlock(objects, ["d"], panel()[at + 1], "below");
    }
    expect(panel()).toEqual(["c", "b", "d", "a"]);
  });
  it("ignores an empty drag or an anchor that left the page", () => {
    const objects = stack("a", "b");
    expect(placeBlock(objects, [], "a", "above")).toBe(objects);
    expect(placeBlock(objects, ["a"], "gone", "above")).toBe(objects);
  });
});

describe("stepBlock", () => {
  it("steps toward the front and the back", () => {
    expect(order(stepBlock(stack("a", "b", "c"), ["a"], 1))).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(order(stepBlock(stack("a", "b", "c"), ["c"], -1))).toEqual([
      "a",
      "c",
      "b",
    ]);
  });
  it("keeps a block together and returns the same list at the edges", () => {
    const objects = stack("a", "b", "c");
    expect(order(stepBlock(objects, ["a", "b"], 1))).toEqual(["c", "a", "b"]);
    expect(stepBlock(objects, ["c"], 1)).toBe(objects);
    expect(stepBlock(objects, ["a"], -1)).toBe(objects);
  });
  it("accepts an empty selection without touching the page", () => {
    const objects = stack("a", "b");
    expect(stepBlock(objects, [], 1)).toBe(objects);
  });
});
