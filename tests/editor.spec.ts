import { test, expect, type Page } from "@playwright/test";
import JSZip from "jszip";
import fs from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(6);
  await page.waitForTimeout(600);
});

test("renders three editable artboards without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Your canvas" }),
  ).toBeVisible();
  await expect(page.locator(".artboard-item")).toHaveCount(3);
  await expect(page.getByLabel("Project name")).toHaveValue(
    "Bloom — Play Store",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: test.info().outputPath("desktop.png") });
  expect(errors).toEqual([]);
});

test("background, custom dimensions, undo and redo", async ({ page }) => {
  await page.getByLabel("Color hex", { exact: true }).fill("#AACC99");
  await page.getByLabel("Color hex", { exact: true }).press("Tab");
  await expect(page.getByLabel("Color hex", { exact: true })).toHaveValue(
    "#AACC99",
  );
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("Color hex", { exact: true })).toHaveValue(
    "#E7EFDB",
  );
  await page
    .getByRole("button", { name: "Redo (Ctrl+Y)", exact: true })
    .click();
  await expect(page.getByLabel("Color hex", { exact: true })).toHaveValue(
    "#AACC99",
  );
  // Background offers solid, gradient and image as picture tiles.
  await expect(page.locator(".bg-types > button")).toHaveCount(3);
  await page.getByRole("button", { name: "Gradient", exact: true }).click();
  // A ready-made gradient fills both stops and the angle.
  await page.getByRole("button", { name: "Use gradient Lilac haze" }).click();
  await expect(page.getByLabel("Stop 1 hex")).toHaveValue("#EBE5F5");
  await expect(page.getByLabel("Stop 2 hex")).toHaveValue("#A79AD0");
  await expect(page.getByLabel("Angle")).toHaveValue("160");
  await page.getByRole("button", { name: "Add color stop" }).click();
  await expect(page.getByLabel("Stop 3 hex")).toBeVisible();
  await page.getByLabel("W", { exact: true }).fill("1024");
  await page.getByLabel("W", { exact: true }).press("Tab");
  await page.getByLabel("H", { exact: true }).fill("500");
  await page.getByLabel("H", { exact: true }).press("Tab");
  await expect(page.getByLabel("Canvas preset")).toHaveValue("4");
});

test("text editing, duplicate, layers and keyboard nudge", async ({ page }) => {
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page
    .getByRole("button", { name: "Add a text box", exact: true })
    .click();
  await page.getByLabel("Text content").fill("বাংলায় আপনার গল্প");
  await page.getByLabel("Font family").selectOption("Noto Sans Bengali");
  await page.getByLabel("Text content").press("Tab");
  await page.getByLabel("Layer name").fill("Bengali heading");
  await page.getByLabel("Layer name").press("Tab");
  await page.locator(".canvas-heading h1").click();
  await page.keyboard.press("Control+d");
  await expect(page.getByLabel("Layer name")).toHaveValue(
    "Bengali heading copy",
  );
  await expect(page.getByLabel("X", { exact: true })).toHaveValue("135");
  const x = Number(await page.getByLabel("X", { exact: true }).inputValue());
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.getByLabel("X", { exact: true })).toHaveValue(
    String(x + 10),
  );
  await page
    .getByRole("button", { name: "Layers", exact: true })
    .first()
    .click();
  await expect(page.locator(".layer-item")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Hide Bengali heading copy", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Show Bengali heading copy",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Delete");
  await expect(page.locator(".layer-item")).toHaveCount(7);
});

test("canvas drag and handle resize persist correctly", async ({ page }) => {
  const bounds = await page.locator(".artboard-canvas").first().boundingBox();
  if (!bounds) throw Error("Missing canvas");
  const s = bounds.width / 1080;
  await page.mouse.click(bounds.x + 200 * s, bounds.y + 265 * s);
  await expect(page.getByLabel("Layer name")).toHaveValue("Headline");
  const xBefore = Number(
    await page.getByLabel("X", { exact: true }).inputValue(),
  );
  await page.mouse.move(bounds.x + 200 * s, bounds.y + 265 * s);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 270 * s, bounds.y + 315 * s, { steps: 8 });
  await page.mouse.up();
  const xAfter = Number(
    await page.getByLabel("X", { exact: true }).inputValue(),
  );
  expect(xAfter).toBeGreaterThan(xBefore + 30);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("X", { exact: true })).toHaveValue(
    String(xBefore),
  );
});

test("exact-size PNG, transparent PNG and batch ZIP export", async ({
  page,
}) => {
  await page.locator(".export-button").click();
  await page.locator(".modal select").selectOption("current");
  await page.getByRole("checkbox", { name: /Transparent background/ }).check();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export screenshot", exact: true })
    .click();
  const file = await downloadPromise;
  const buffer = await fs.readFile((await file.path())!);
  expect(buffer.readUInt32BE(16)).toBe(1080);
  expect(buffer.readUInt32BE(20)).toBe(1920);
  const alpha = await page.evaluate(async (b64) => {
    const i = new Image();
    i.src = "data:image/png;base64," + b64;
    await i.decode();
    const c = document.createElement("canvas");
    c.width = i.width;
    c.height = i.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(i, 0, 0);
    return ctx.getImageData(0, 0, 1, 1).data[3];
  }, buffer.toString("base64"));
  expect(alpha).toBe(0);
  await page.locator(".export-button").click();
  await page.locator(".modal select").selectOption("all");
  const zipPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export 3 pages", exact: true })
    .click();
  const zipDownload = await zipPromise;
  const zip = await JSZip.loadAsync(
    await fs.readFile((await zipDownload.path())!),
  );
  expect(Object.keys(zip.files)).toHaveLength(3);
  for (const file of Object.values(zip.files)) {
    const b = await file.async("nodebuffer");
    expect(b.readUInt32BE(16)).toBe(1080);
    expect(b.readUInt32BE(20)).toBe(1920);
  }
});

test("image upload, project save/import and autosave", async ({ page }) => {
  await page.getByRole("button", { name: "Frames", exact: true }).click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "screen.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="800"><rect width="400" height="800" fill="#FF8855"/><circle cx="200" cy="300" r="100" fill="white"/></svg>',
      ),
    });
  // Default file target is a free image; the editor still keeps the original locally.
  await expect(page.getByLabel("Layer name")).toHaveValue("screen.svg");
  await page.getByLabel("Project name").fill("My saved project");
  await page.getByLabel("Project name").press("Tab");
  await page.getByLabel("Project menu").click();
  const dp = page.waitForEvent("download");
  await page.getByRole("button", { name: /Save project/ }).click();
  const d = await dp;
  const json = await fs.readFile((await d.path())!);
  const project = JSON.parse(json.toString());
  expect(project.name).toBe("My saved project");
  expect(project.pages[0].objects.at(-1).src).toMatch(/^data:image/);
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByLabel("Project name")).toHaveValue("My saved project");
  project.name = "Imported project";
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "project.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await expect(page.getByLabel("Project name")).toHaveValue("Imported project");
});

test("searchable icon library and page operations", async ({ page }) => {
  await page.getByRole("button", { name: "Elements", exact: true }).click();
  await page.getByRole("button", { name: "Icons", exact: true }).click();
  await page.getByLabel("Search icons").fill("Heart");
  await page
    .getByRole("button", { name: "Add Heart icon", exact: true })
    .click();
  await expect(page.getByLabel("Layer name")).toHaveValue("Heart");
  await page
    .getByRole("button", { name: "Add page", exact: true })
    .first()
    .click();
  await expect(page.locator(".artboard-item")).toHaveCount(4);
  await page.getByLabel("Page 4 options").click();
  await page
    .getByRole("button", { name: "Duplicate page", exact: true })
    .click();
  await expect(page.locator(".artboard-item")).toHaveCount(5);
});

test("mobile canvas and bottom sheets keep tools accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: test.info().outputPath("mobile.png") });
  await page
    .locator(".mobile-bottom-nav")
    .getByRole("button", { name: "Tools", exact: true })
    .click();
  await expect(page.locator(".left-panel-wrap")).toBeVisible();
  await page
    .locator(".mobile-tool-tabs")
    .getByRole("button", { name: "Text", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add a text box", exact: true })
    .click();
  await expect(page.locator(".left-panel-wrap")).not.toBeVisible();
  await page
    .locator(".mobile-bottom-nav")
    .getByRole("button", { name: "Properties", exact: true })
    .click();
  await expect(page.getByLabel("Text content")).toBeVisible();
  await page.getByLabel("Text content").fill("Made on mobile.");
  await page.screenshot({
    path: test.info().outputPath("mobile-properties.png"),
  });
});

test("resize handles update size and preserve undo", async ({ page }) => {
  const b = await page.locator(".artboard-canvas").first().boundingBox();
  if (!b) throw Error();
  const s = b.width / 1080;
  await page.mouse.click(b.x + 200 * s, b.y + 260 * s);
  await expect(page.getByLabel("Layer name")).toHaveValue("Headline");
  await page.mouse.move(b.x + 1000 * s, b.y + 485 * s);
  await page.mouse.down();
  await page.mouse.move(b.x + 1040 * s, b.y + 545 * s, { steps: 8 });
  await page.mouse.up();
  expect(
    Number(await page.getByLabel("W", { exact: true }).inputValue()),
  ).toBeGreaterThan(900);
  expect(
    Number(await page.getByLabel("Size", { exact: true }).inputValue()),
  ).toBeGreaterThan(100);
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(page.getByLabel("W", { exact: true })).toHaveValue("900");
});

/** A two-tone picture: mostly orange with a white circle on it. */
const TONE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="800">' +
  '<rect width="400" height="800" fill="#FF8855"/>' +
  '<circle cx="200" cy="300" r="100" fill="#FFFFFF"/></svg>';

/** The page background as the editor persisted it. */
const savedBackground = (page: Page) =>
  page.evaluate(() => {
    const saved = JSON.parse(
      localStorage.getItem("zero-mockup-project-v1") || "null",
    );
    return saved?.pages?.[0]?.background ?? null;
  });

const channels = (color: string) =>
  [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16));

test("an uploaded picture suggests solid and gradient backgrounds", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Image", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Upload background", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "hero.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(TONE_SVG),
  });

  // The colours are read from the picture that was just uploaded.
  const swatches = page.locator(".swatches.photo > button");
  await expect(swatches.first()).toBeVisible();
  const colors = (
    await swatches.evaluateAll((els) =>
      els.map((el) => el.getAttribute("aria-label") || ""),
    )
  ).map((label) => {
    const match = label.match(/^Fill from image (#[0-9a-f]{6})$/);
    if (!match) throw new Error("Unexpected swatch label: " + label);
    return match[1];
  });
  // The biggest area comes first, and it is the picture's own orange rather
  // than the centre of a quantisation cube.
  const [r, g, b] = channels(colors[0]);
  expect(r).toBeGreaterThan(245);
  expect(g).toBeGreaterThan(120);
  expect(g).toBeLessThan(160);
  expect(b).toBeGreaterThan(60);
  expect(b).toBeLessThan(115);
  // The white circle is offered next to it.
  expect(
    colors.some((color) => {
      const [cr, cg, cb] = channels(color);
      return cr > 235 && cg > 235 && cb > 235;
    }),
  ).toBe(true);

  // Tapping a swatch fills the page solid, straight away.
  await swatches.first().click();
  await expect
    .poll(() => savedBackground(page))
    .toMatchObject({ type: "solid", color: colors[0] });

  // And a tile turns the same colours into a gradient.
  await page.getByRole("button", { name: "Use Photo · soft" }).click();
  await expect
    .poll(() => savedBackground(page))
    .toMatchObject({ type: "linear" });
  const gradient = await savedBackground(page);
  expect(gradient.colors).toHaveLength(2);
  expect(gradient.colors[1]).toBe(colors[0]);
  // The pale end is a light wash of that colour.
  expect(channels(gradient.colors[0])[0]).toBeGreaterThan(240);
});

test("a device screenshot can colour the page too", async ({ page }) => {
  await page.getByRole("button", { name: "Frames", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Upload a screenshot", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "app.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(TONE_SVG),
  });
  await expect(page.getByLabel("Layer name")).toHaveValue("App screenshot");
  // The selected device's screen is sampled when the page has no upload.
  await page.getByRole("button", { name: "Use Photo · glow" }).click();
  await expect
    .poll(() => savedBackground(page))
    .toMatchObject({ type: "radial" });
});

test("property fields update the canvas while they are still focused", async ({
  page,
}) => {
  const b = await page.locator(".artboard-canvas").first().boundingBox();
  if (!b) throw Error("Missing canvas");
  const s = b.width / 1080;
  await page.mouse.click(b.x + 200 * s, b.y + 260 * s);
  await expect(page.getByLabel("Layer name")).toHaveValue("Headline");

  /** A cheap fingerprint of what the artboard actually painted. */
  const painted = () =>
    page
      .locator(".artboard-item.is-active canvas")
      .first()
      .evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        const { data } = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height);
        let digest = 0;
        for (let i = 0; i < data.length; i += 53)
          digest = (digest * 33 + data[i]) | 0;
        return digest;
      });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const before = await painted();

  // Text size, typed and deliberately never blurred, tabbed away from or
  // confirmed with Enter.
  const size = page.getByLabel("Size", { exact: true });
  await size.fill("84");
  await expect(size).toBeFocused();
  await expect
    .poll(painted, { message: "the artboard repaints while typing" })
    .not.toBe(before);

  const resized = await painted();
  // Position & size behave the same way: the object is already moved.
  const x = page.getByLabel("X", { exact: true });
  const startX = Number(await x.inputValue());
  await x.fill(String(startX + 40));
  await expect(x).toBeFocused();
  await expect
    .poll(painted, { message: "the object moves while typing" })
    .not.toBe(resized);

  // The project is updated too, still without the X field losing focus.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(
          localStorage.getItem("zero-mockup-project-v1") || "null",
        );
        const headline = saved?.pages?.[0]?.objects?.find(
          (o: { name: string }) => o.name === "Headline",
        );
        return [headline?.fontSize, headline?.x];
      }),
    )
    .toEqual([84, startX + 40]);
  await expect(x).toBeFocused();
});

test("every page still exports on a phone-sized screen", async ({ page }) => {
  // On handheld layouts only the pages near the viewport keep a live Konva
  // stage, so exporting all of them has to bring the others back first —
  // this is the case that used to end in "Export failed".
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".artboard-item")).toHaveCount(3);
  // The last page is far outside the viewport, so it is only a placeholder.
  await expect(
    page.locator(".artboard-item").nth(2).locator("canvas"),
  ).toHaveCount(0);

  await page.locator(".export-button").click();
  await page.locator(".modal select").selectOption("all");
  const zipPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export 3 pages", exact: true })
    .click();
  const zipDownload = await zipPromise;
  const zip = await JSZip.loadAsync(
    await fs.readFile((await zipDownload.path())!),
  );
  expect(Object.keys(zip.files)).toHaveLength(3);
  for (const file of Object.values(zip.files)) {
    const buffer = await file.async("nodebuffer");
    expect(buffer.readUInt32BE(16)).toBe(1080);
    expect(buffer.readUInt32BE(20)).toBe(1920);
  }
  // The success note, not the failure one.
  await expect(page.locator(".toast")).toContainText("exported at");
});

test("a burst of typing in one property is a single undo step", async ({
  page,
}) => {
  const b = await page.locator(".artboard-canvas").first().boundingBox();
  if (!b) throw Error("Missing canvas");
  const s = b.width / 1080;
  await page.mouse.click(b.x + 200 * s, b.y + 260 * s);
  const width = page.getByLabel("W", { exact: true });
  await expect(width).toHaveValue("900");

  await width.press("Control+a");
  await page.keyboard.type("612", { delay: 40 });
  await expect(width).toHaveValue("612");
  await page.keyboard.press("Tab");
  await page
    .getByRole("button", { name: "Undo (Ctrl+Z)", exact: true })
    .click();
  await expect(width).toHaveValue("900");
});

test("grouping moves multiple layers together and can be undone", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Layers", exact: true })
    .first()
    .click();
  await page
    .locator(".layer-item")
    .filter({ has: page.getByText("Headline", { exact: true }) })
    .click();
  await page
    .locator(".layer-item")
    .filter({ has: page.getByText("Subheading", { exact: true }) })
    .click({ modifiers: ["Shift"] });
  await expect(
    page.getByRole("heading", { name: "2 objects selected" }),
  ).toBeVisible();
  await page.keyboard.press("Control+g");
  const b = await page.locator(".artboard-canvas").first().boundingBox();
  if (!b) throw Error();
  const s = b.width / 1080;
  await page.mouse.move(b.x + 200 * s, b.y + 265 * s);
  await page.mouse.down();
  await page.mouse.move(b.x + 270 * s, b.y + 320 * s, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zero-mockup-project-v1")!),
  );
  const h = p.pages[0].objects.find(
    (o: { name: string }) => o.name === "Headline",
  );
  const sub = p.pages[0].objects.find(
    (o: { name: string }) => o.name === "Subheading",
  );
  expect(h.groupId).toBeTruthy();
  expect(h.groupId).toBe(sub.groupId);
  expect(Math.abs(h.x - 100 - (sub.x - 105))).toBeLessThan(2);
  await page.keyboard.press("Control+Shift+g");
  await page.waitForTimeout(800);
  const grouped = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("zero-mockup-project-v1")!,
    ).pages[0].objects.filter((o: { groupId?: string }) => o.groupId),
  );
  expect(grouped).toHaveLength(0);
});

test("device screenshot replacement and JPG export", async ({ page }) => {
  await page.getByRole("button", { name: "Frames", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Upload a screenshot", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "app.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1200"><rect width="600" height="1200" fill="#cc6644"/></svg>',
    ),
  });
  await expect(page.getByLabel("Layer name")).toHaveValue("App screenshot");
  await expect(
    page.getByRole("button", { name: "Replace screenshot", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Device style").selectOption("android");
  await page.getByLabel("3D perspective tilt").fill("22");
  await expect(page.getByLabel("3D perspective tilt")).toHaveValue("22");
  await page.waitForTimeout(250);
  await page.locator(".export-button").click();
  await page.getByRole("button", { name: /JPG Maximum quality/ }).click();
  await page.locator(".modal select").selectOption("current");
  await expect(
    page.getByRole("checkbox", { name: /Transparent background/ }),
  ).toBeDisabled();
  const dp = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export screenshot", exact: true })
    .click();
  const d = await dp;
  expect(d.suggestedFilename()).toMatch(/\.jpg$/);
  const bytes = await fs.readFile((await d.path())!);
  expect(bytes[0]).toBe(255);
  expect(bytes[1]).toBe(216);
  const size = await page.evaluate(async (b64) => {
    const i = new Image();
    i.src = "data:image/jpeg;base64," + b64;
    await i.decode();
    return [i.width, i.height];
  }, bytes.toString("base64"));
  expect(size).toEqual([1080, 1920]);
});

test("page tabs open a hold menu and the last page becomes a blank page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const tabs = page.locator(".page-tabs > button:not(.icon-button)");
  await expect(tabs).toHaveCount(3);

  const pressAndHold = async (index: number) => {
    const tab = tabs.nth(index);
    await tab.scrollIntoViewIfNeeded();
    const box = (await tab.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    const menu = page.locator(".page-tap-menu");
    await expect(menu).toBeVisible();
    return menu;
  };

  // Holding a tab must not also select it.
  await expect(tabs.nth(0)).toHaveClass(/active/);
  const menu = await pressAndHold(1);
  await expect(tabs.nth(0)).toHaveClass(/active/);
  await menu.getByRole("button", { name: "Duplicate page" }).click();
  await expect(tabs).toHaveCount(4);

  // Delete every page: the last one is replaced by a blank page.
  for (const count of [3, 2, 1, 1]) {
    const held = await pressAndHold(0);
    await held.getByRole("button", { name: "Delete page" }).click();
    await expect(tabs).toHaveCount(count);
  }
  await expect(tabs).toHaveAttribute("aria-label", /Blank page/);
  await expect(tabs).toHaveClass(/active/);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zero-mockup-project-v1")!),
  );
  expect(saved.pages).toHaveLength(1);
  expect(saved.pages[0].objects).toEqual([]);
});

test("nothing is text-selectable except real fields", async ({ page }) => {
  // The editor is a canvas app: pressing and holding must not select labels.
  await page.locator(".page-tabs > button:not(.icon-button)").first().hover();
  await page.mouse.down();
  await page.mouse.move(320, 300, { steps: 6 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  expect(
    await page.evaluate(() => getComputedStyle(document.body).userSelect),
  ).toBe("none");

  // Inputs and text areas still behave like text fields.
  const label = page.getByLabel("Layer name");
  await label.fill("renamed");
  await label.click();
  await page.keyboard.press("Control+a");
  expect(await page.evaluate(() => window.getSelection()?.toString())).not.toBe(
    "",
  );
  await label.fill("Headline");
});

test("pan tool moves the workspace, not the objects, and the pad nudges", async ({
  page,
}) => {
  const bounds = await page.locator(".artboard-canvas").first().boundingBox();
  if (!bounds) throw Error("Missing canvas");
  const s = bounds.width / 1080;

  await page.getByRole("button", { name: /Pan tool/ }).click();

  // Dragging across an object scrolls the workspace instead of moving it.
  await page.mouse.move(bounds.x + 200 * s, bounds.y + 260 * s);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 60, bounds.y + 40, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zero-mockup-project-v1")!),
  );
  const headline = saved.pages[0].objects.find(
    (o: { name: string }) => o.name === "Headline",
  );
  expect([headline.x, headline.y]).toEqual([100, 220]);
  // Nothing got selected either — the pan tool only moves the view.
  await expect(page.getByRole("heading", { name: /selected/ })).toHaveCount(0);

  // Select an object another way: the pad then nudges it.
  await page
    .getByRole("button", { name: "Layers", exact: true })
    .first()
    .click();
  await page
    .locator(".layer-item")
    .filter({ has: page.getByText("Headline", { exact: true }) })
    .click();
  await expect(page.getByLabel("Move right")).toBeVisible();
  const x = page.getByLabel("X", { exact: true });
  await page.getByLabel("Move right").click();
  expect(Number(await x.inputValue())).toBeGreaterThan(100);
  await page.getByRole("button", { name: "Undo (Ctrl+Z)" }).click();
  await expect(x).toHaveValue("100");

  // And with nothing selected the pad pans the workspace.
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Pan right")).toBeVisible();
});

test("arrow keys nudge the selection and undo once per burst", async ({
  page,
}) => {
  const bounds = await page.locator(".artboard-canvas").first().boundingBox();
  if (!bounds) throw Error("Missing canvas");
  const s = bounds.width / 1080;
  await page.mouse.click(bounds.x + 200 * s, bounds.y + 260 * s);
  const x = page.getByLabel("X", { exact: true });
  const start = Number(await x.inputValue());

  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await expect(x).toHaveValue(String(start + 5));
  await page.keyboard.press("Shift+ArrowDown");
  await expect(page.getByLabel("Y", { exact: true })).toHaveValue("270");

  await page.getByRole("button", { name: "Undo (Ctrl+Z)" }).click();
  await expect(x).toHaveValue(String(start));
});
