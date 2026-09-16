import { describe, expect, it } from "vitest";
import {
  baseObject,
  createProject,
  defaultBackground,
  demoScreen,
  duplicatePage,
  isProject,
  makePage,
  presets,
  svgData,
  templateInfo,
} from "./model";
describe("project model", () => {
  it("starts with three self-contained, valid editable artboards", () => {
    const p = createProject();
    expect(isProject(p)).toBe(true);
    expect(p.pages).toHaveLength(3);
    expect(p.pages.every((p) => p.objects.length === 6)).toBe(true);
  });
  it("makes unique ids for every page and object", () => {
    const p = createProject();
    const ids = p.pages.flatMap((p) => [p.id, ...p.objects.map((o) => o.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("all templates make valid projects", () => {
    for (let i = 0; i < templateInfo.length; i++) {
      const p = createProject();
      p.pages = [makePage(i)];
      expect(isProject(p)).toBe(true);
    }
  });
  it("duplicates page contents without sharing ids or background references", () => {
    const p = makePage();
    const copy = duplicatePage(p);
    expect(copy.id).not.toBe(p.id);
    expect(copy.objects.map((o) => o.id)).not.toEqual(
      p.objects.map((o) => o.id),
    );
    copy.background.colors[0] = "#000000";
    expect(p.background.colors[0]).not.toBe("#000000");
  });
  it("round-trips Unicode and embedded image data", () => {
    const p = createProject();
    p.name = "আমার অ্যাপ";
    p.pages[0].objects.push(
      baseObject("image", {
        src: svgData('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      }),
    );
    const parsed = JSON.parse(JSON.stringify(p));
    expect(isProject(parsed)).toBe(true);
    expect(parsed).toEqual(p);
  });
  it.each([
    null,
    undefined,
    [],
    {},
    "bad JSON",
    1,
    { version: 1, pages: [null] },
    { ...createProject(), pages: [] },
  ])("rejects malformed projects without throwing: %s", (v) => {
    expect(isProject(v)).toBe(false);
  });
  it("rejects unreasonable canvas dimensions, duplicate ids and nonfinite coordinates", () => {
    const p = createProject();
    p.pages[0].width = 9000;
    expect(isProject(p)).toBe(false);
    p.pages[0].width = 1080;
    p.pages[0].objects[0].x = Infinity;
    expect(isProject(p)).toBe(false);
    p.pages[0].objects[0].x = 10;
    p.pages[1].id = p.pages[0].id;
    expect(isProject(p)).toBe(false);
  });
  it("does not allow imported projects to fetch remote images", () => {
    const p = createProject();
    p.pages[0].objects[0].src = "https://example.com/tracking.png";
    expect(isProject(p)).toBe(false);
  });
  it("validates gradient stops and opacity", () => {
    const p = createProject();
    p.pages[0].background.colors = [];
    expect(isProject(p)).toBe(false);
    p.pages[0].background = defaultBackground();
    p.pages[0].background.opacity = 2;
    expect(isProject(p)).toBe(false);
  });
  it("includes exact Play Store-requested presets", () => {
    expect(presets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 1024, height: 500 }),
        expect.objectContaining({ width: 512, height: 512 }),
        expect.objectContaining({ width: 1080, height: 2340 }),
      ]),
    );
  });
  it("ships three distinct screenshot previews as encoded SVGs", () => {
    const screens = [0, 1, 2].map(demoScreen);
    expect(new Set(screens).size).toBe(3);
    screens.forEach((s) =>
      expect(decodeURIComponent(s.split(",")[1])).toContain("<svg"),
    );
  });
});
