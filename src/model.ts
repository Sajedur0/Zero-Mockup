export type ObjectKind = "text" | "device" | "shape" | "image" | "icon";
export type DesignObject = {
  id: string;
  name: string;
  kind: ObjectKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  groupId?: string;
  fill: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  stroke?: string;
  strokeWidth?: number;
  shape?: string;
  src?: string;
  frame?: "android" | "iphone" | "none";
  radius?: number;
  shadow?: number;
  tilt?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  demo?: number;
  icon?: string;
};
export type Background = {
  type: "solid" | "linear" | "radial" | "image" | "pattern";
  color: string;
  colors: string[];
  angle: number;
  src?: string;
  blur: number;
  opacity: number;
  pattern: "dots" | "grid" | "waves";
};
export type Page = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: Background;
  objects: DesignObject[];
};
export type Project = {
  version: 1;
  name: string;
  pages: Page[];
  brand: { colors: string[]; font: string };
};
export const uid = () => crypto.randomUUID();
export const palettes = [
  "#e7efdb",
  "#f7e6db",
  "#ebe5f5",
  "#ddeaf3",
  "#f5eabf",
  "#f1f1ef",
  "#254e3b",
  "#e87b53",
  "#a79ad0",
  "#ffffff",
  "#212c25",
  "#000000",
];
export const presets = [
  { name: "Phone · 9:16", width: 1080, height: 1920 },
  { name: "Phone · 9:19.5", width: 1080, height: 2340 },
  { name: "7″ Tablet", width: 1200, height: 1920 },
  { name: "10″ Tablet", width: 1600, height: 2560 },
  { name: "Feature Graphic", width: 1024, height: 500 },
  { name: "App Icon", width: 512, height: 512 },
];
export const baseObject = (
  kind: ObjectKind,
  props: Partial<DesignObject> = {},
): DesignObject => ({
  id: uid(),
  name: kind[0].toUpperCase() + kind.slice(1),
  kind,
  x: 100,
  y: 100,
  width: 450,
  height: 180,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "#254e3b",
  ...props,
});
export const defaultBackground = (color = "#e7efdb"): Background => ({
  type: "solid",
  color,
  colors: [color, "#ffffff"],
  angle: 135,
  blur: 0,
  opacity: 1,
  pattern: "dots",
});
export const templateInfo = [
  {
    name: "A little everyday",
    category: "Wellness",
    colors: ["#e7efdb", "#f7e6db", "#ebe5f5"],
    headline: "Small habits.\nBig changes.",
    sub: "A little better, every day.",
    tag: "bloom",
    dark: false,
  },
  {
    name: "In your element",
    category: "Lifestyle",
    colors: ["#f4c4aa", "#f6e8dc", "#f7d6c8"],
    headline: "Find your\neveryday joy.",
    sub: "Make space for what matters.",
    tag: "luma",
    dark: false,
  },
  {
    name: "Made of momentum",
    category: "Fitness",
    colors: ["#252e2a", "#dcec9b", "#30382d"],
    headline: "Show up.\nLevel up.",
    sub: "Your next chapter starts here.",
    tag: "stride",
    dark: true,
  },
  {
    name: "Money, made simple",
    category: "Finance",
    colors: ["#deddf5", "#cce7df", "#e7e3f6"],
    headline: "Less worry.\nMore living.",
    sub: "Meet your money, reimagined.",
    tag: "penny",
    dark: false,
  },
  {
    name: "A clearer head",
    category: "Wellness",
    colors: ["#dce8f0", "#e9e8dc", "#d8e3ed"],
    headline: "Breathe in.\nTune out.",
    sub: "A quiet moment, just for you.",
    tag: "still",
    dark: false,
  },
  {
    name: "Bright ideas",
    category: "Productivity",
    colors: ["#f8e9b1", "#eedeca", "#f5e7b2"],
    headline: "Big ideas.\nMeet action.",
    sub: "Your best work starts here.",
    tag: "note",
    dark: false,
  },
];
export function makePage(template = 0, index = 0): Page {
  const t = templateInfo[template];
  const color = t.colors[index % 3];
  const ink = t.dark && index !== 1 ? "#f0f5e6" : "#263d31";
  const headlines =
    template === 0
      ? [
          "Small habits.\nBig changes.",
          "Your progress,\nin full bloom.",
          "A little focus.\nA lot of growth.",
        ]
      : [t.headline, t.headline, t.headline];
  const subtitles =
    template === 0
      ? [
          "A little better, every day.",
          "See how far you’ve come.",
          "Make time for what matters.",
        ]
      : [t.sub, t.sub, t.sub];
  return {
    id: uid(),
    name: ["Build better habits", "Celebrate your progress", "Find your focus"][
      index % 3
    ],
    width: 1080,
    height: 1920,
    background: defaultBackground(color),
    objects: [
      baseObject("shape", {
        name: "Soft accent",
        shape: "circle",
        x: 690,
        y: 1250,
        width: 700,
        height: 700,
        fill:
          template === 0
            ? ["#d4e2c1", "#f0ccb6", "#d7cbe9"][index % 3]
            : t.colors[(index + 1) % 3],
        opacity: 0.6,
      }),
      baseObject("text", {
        name: "Brand name",
        text: "✳  " + t.tag,
        x: 100,
        y: 80,
        width: 800,
        height: 60,
        fontFamily: "Manrope",
        fontSize: 40,
        fontWeight: "bold",
        fill: ink,
      }),
      baseObject("text", {
        name: "Headline",
        text: headlines[index % 3],
        x: 100,
        y: 220,
        width: 900,
        height: 265,
        fontFamily: "Manrope",
        fontSize: 100,
        fontWeight: "bold",
        lineHeight: 1.12,
        letterSpacing: -4,
        fill: ink,
      }),
      baseObject("text", {
        name: "Subheading",
        text: subtitles[index % 3],
        x: 105,
        y: 485,
        width: 900,
        height: 100,
        fontFamily: "DM Sans",
        fontSize: 35,
        fontWeight: "normal",
        lineHeight: 1.3,
        fill: ink,
        opacity: 0.75,
      }),
      baseObject("device", {
        name: "App screenshot",
        x: index === 1 ? 115 : 215,
        y: index === 1 ? 670 : 720,
        width: 745,
        height: 1510,
        rotation: index === 1 ? 7 : -7,
        frame: "iphone",
        fill: "#252b27",
        radius: 95,
        shadow: 45,
        demo: index % 3,
      }),
      baseObject("text", {
        name: "Little sparkle",
        text: "✳",
        x: index === 1 ? 840 : 35,
        y: index === 1 ? 605 : 1300,
        width: 160,
        height: 180,
        fontFamily: "Manrope",
        fontSize: 155,
        fill: ink,
        rotation: 12,
      }),
    ],
  };
}
export const createProject = (): Project => ({
  version: 1,
  name: "Bloom — Play Store",
  pages: [0, 1, 2].map((i) => makePage(0, i)),
  brand: {
    colors: ["#254e3b", "#e7efdb", "#f7e6db", "#ebe5f5", "#e87b53"],
    font: "Manrope",
  },
});
export function duplicatePage(page: Page): Page {
  return {
    ...structuredClone(page),
    id: uid(),
    name: page.name + " copy",
    objects: page.objects.map((o) => ({ ...o, id: uid() })),
  };
}
/** Validate imported/local JSON before allowing it into the renderer.
 * Images stay self-contained; external URLs are intentionally not loaded.
 */
export function isProject(value: unknown): value is Project {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const color = (v: unknown) =>
    typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  const finite = (v: unknown, min = -100000, max = 100000): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const image = (v: unknown) =>
    v === undefined ||
    (typeof v === "string" &&
      /^data:image\/(png|jpeg|webp|gif|svg\+xml)[;,]/i.test(v));
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.name !== "string" ||
    !Array.isArray(value.pages) ||
    !value.pages.length ||
    value.pages.length > 30 ||
    !isRecord(value.brand) ||
    !Array.isArray(value.brand.colors) ||
    !value.brand.colors.every(color) ||
    typeof value.brand.font !== "string"
  )
    return false;
  const pageIds = new Set<string>();
  return value.pages.every((page) => {
    if (
      !isRecord(page) ||
      typeof page.id !== "string" ||
      pageIds.has(page.id) ||
      typeof page.name !== "string" ||
      !finite(page.width, 100, 8000) ||
      !Number.isInteger(page.width) ||
      !finite(page.height, 100, 8000) ||
      !Number.isInteger(page.height) ||
      !Array.isArray(page.objects) ||
      page.objects.length > 1000 ||
      !isRecord(page.background)
    )
      return false;
    pageIds.add(page.id);
    const b = page.background;
    if (
      !["solid", "linear", "radial", "image", "pattern"].includes(
        String(b.type),
      ) ||
      !color(b.color) ||
      !Array.isArray(b.colors) ||
      b.colors.length < 2 ||
      b.colors.length > 6 ||
      !b.colors.every(color) ||
      !finite(b.angle, 0, 360) ||
      !finite(b.blur, 0, 100) ||
      !finite(b.opacity, 0, 1) ||
      !["dots", "grid", "waves"].includes(String(b.pattern)) ||
      !image(b.src)
    )
      return false;
    const ids = new Set<string>();
    return page.objects.every((o) => {
      if (
        !isRecord(o) ||
        typeof o.id !== "string" ||
        ids.has(o.id) ||
        typeof o.name !== "string" ||
        !["text", "device", "shape", "image", "icon"].includes(
          String(o.kind),
        ) ||
        ![o.x, o.y, o.rotation].every((v) => finite(v)) ||
        !finite(o.width, 1, 50000) ||
        !finite(o.height, 1, 50000) ||
        !finite(o.opacity, 0, 1) ||
        typeof o.locked !== "boolean" ||
        typeof o.visible !== "boolean" ||
        !color(o.fill) ||
        !image(o.src)
      )
        return false;
      ids.add(o.id);
      if (o.kind === "text" && typeof o.text !== "string") return false;
      if (o.fontFamily !== undefined && typeof o.fontFamily !== "string")
        return false;
      if (
        o.fontWeight !== undefined &&
        !["normal", "bold", "italic", "bold italic"].includes(
          String(o.fontWeight),
        )
      )
        return false;
      if (
        o.align !== undefined &&
        !["left", "center", "right"].includes(String(o.align))
      )
        return false;
      if (
        o.frame !== undefined &&
        !["iphone", "android", "none"].includes(String(o.frame))
      )
        return false;
      if (o.stroke !== undefined && !color(o.stroke)) return false;
      if (o.groupId !== undefined && typeof o.groupId !== "string")
        return false;
      for (const key of [
        "fontSize",
        "lineHeight",
        "letterSpacing",
        "strokeWidth",
        "shadow",
        "radius",
        "tilt",
        "brightness",
        "contrast",
        "saturation",
        "demo",
      ])
        if (o[key] !== undefined && !finite(o[key])) return false;
      return true;
    });
  });
}
export function download(data: Blob | string, name: string) {
  const a = document.createElement("a");
  const url = typeof data === "string" ? data : URL.createObjectURL(data);
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof data !== "string")
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function svgData(svg: string) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
export function demoScreen(index = 0): string {
  const common = `<rect width="660" height="1370" fill="#fafbf6"/><text x="42" y="48" font-family="Arial" font-size="23" font-weight="bold" fill="#263d31">9:41</text><path d="M542 34v12m9-18v18m9-24v24" stroke="#263d31" stroke-width="5"/><rect x="589" y="28" width="32" height="16" rx="4" fill="#263d31"/><text x="40" y="135" font-family="Arial" font-size="26" fill="#617163">${index === 0 ? "LET’S MAKE TODAY COUNT" : index === 1 ? "EVERY LITTLE STEP COUNTS" : "A MOMENT FOR YOURSELF"}</text><text x="40" y="194" font-family="Arial" font-size="47" font-weight="bold" fill="#263d31">${index === 0 ? "Good morning, Alex" : index === 1 ? "Look at you grow." : "Find your focus."}</text><circle cx="594" cy="173" r="27" fill="#e4ecd8"/><text x="578" y="184" font-family="Arial" font-size="32" fill="#35533e">✳</text>`;
  const week = ["M", "T", "W", "T", "F", "S", "S"]
    .map(
      (d, i) =>
        `<rect x="${40 + i * 84}" y="243" width="69" height="100" rx="30" fill="${i === 3 ? "#284e3a" : "#f0f2e9"}"/><text x="${64 + i * 84}" y="277" font-family="Arial" font-size="21" fill="${i === 3 ? "#f7f9ec" : "#8a9386"}">${d}</text><text x="${61 + i * 84}" y="317" font-family="Arial" font-size="23" fill="${i === 3 ? "#f7f9ec" : "#364c39"}">${12 + i}</text>`,
    )
    .join("");
  const ring = `<rect x="38" y="379" width="584" height="352" rx="30" fill="#e7eedb"/><text x="67" y="430" font-family="Arial" font-size="24" fill="#536448">${index === 1 ? "THIS WEEK" : "YOUR DAILY BLOOM"}</text><text x="67" y="495" font-family="Arial" font-size="38" font-weight="bold" fill="#284e3a">${index === 1 ? "Growing stronger" : "A little progress,"}</text><text x="67" y="541" font-family="Arial" font-size="38" font-weight="bold" fill="#284e3a">${index === 1 ? "every day." : "a lot of good."}</text><rect x="66" y="635" width="187" height="48" rx="24" fill="#d4e1c4"/><text x="87" y="666" font-family="Arial" font-size="20" fill="#3b5b3c">✦  ${index === 1 ? "12 day streak" : "You’ve got this"}</text><circle cx="491" cy="568" r="87" fill="none" stroke="#cfdbc0" stroke-width="17"/><circle cx="491" cy="568" r="87" fill="none" stroke="#325940" stroke-width="17" stroke-dasharray="390 560" stroke-linecap="round" transform="rotate(-90 491 568)"/><text x="448" y="580" font-family="Arial" font-size="43" font-weight="bold" fill="#284e3a">${index === 1 ? "86%" : "3/5"}</text><text x="463" y="613" font-family="Arial" font-size="17" fill="#64785b">${index === 1 ? "on track" : "habits"}</text>`;
  const habits = ["Drink more water", "Move your body", "Read a few pages"]
    .map(
      (name, i) =>
        `<rect x="38" y="${824 + i * 128}" width="584" height="108" rx="22" fill="white" stroke="#e9ede2" stroke-width="2"/><rect x="58" y="${847 + i * 128}" width="62" height="62" rx="18" fill="${["#e6eef9", "#f8ecda", "#efe7f5"][i]}"/><text x="76" y="${886 + i * 128}" font-family="Arial" font-size="28" fill="${["#719cc5", "#c99750", "#9a81b6"][i]}">${["≈", "↗", "▤"][i]}</text><text x="140" y="${868 + i * 128}" font-family="Arial" font-size="24" font-weight="bold" fill="#314534">${name}</text><text x="140" y="${901 + i * 128}" font-family="Arial" font-size="19" fill="#8b9587">${["Stay refreshed · 2 of 8 glasses", "A little energy · 20 minutes", "Feed your mind · 10 pages"][i]}</text><circle cx="576" cy="${878 + i * 128}" r="17" fill="${i === 1 ? "#355e40" : "none"}" stroke="${i === 1 ? "#355e40" : "#d9e1d0"}" stroke-width="2"/>${i === 1 ? '<path d="M568 1006l6 6 11-12" fill="none" stroke="white" stroke-width="3"/>' : ""}`,
    )
    .join("");
  const focus = `<circle cx="330" cy="605" r="207" fill="#e5ecd8"/><circle cx="330" cy="605" r="176" fill="none" stroke="#bdd0ab" stroke-width="4"/><path d="M330 440c-95 83-105 177 0 295 105-118 95-212 0-295" fill="#3f654b"/><path d="M330 720V485" stroke="#a8bf96" stroke-width="5"/><text x="209" y="951" font-family="Arial" font-size="90" font-weight="bold" fill="#2e4c36">25:00</text><text x="215" y="1000" font-family="Arial" font-size="24" fill="#89957e">Time to plant a little focus</text><rect x="118" y="1075" width="424" height="85" rx="43" fill="#2e513a"/><text x="241" y="1128" font-family="Arial" font-size="27" fill="white">Start focusing</text>`;
  const bottom = `<path d="M0 1240H660" stroke="#e8ece1" stroke-width="2"/><g font-family="Arial" text-anchor="middle"><g font-size="33" fill="#304f3a"><text x="105" y="1290">⌂</text><text x="255" y="1290">▥</text><text x="405" y="1290">◉</text><text x="555" y="1290">☺</text></g><g font-size="16" fill="#839078"><text x="105" y="1320">Today</text><text x="255" y="1320">Progress</text><text x="405" y="1320">Focus</text><text x="555" y="1320">You</text></g></g><rect x="236" y="1351" width="188" height="7" rx="4" fill="#273c2e"/>`;
  return svgData(
    `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="1370" viewBox="0 0 660 1370">${common}${index === 2 ? focus : week + ring + '<text x="40" y="791" font-family="Arial" font-size="28" font-weight="bold" fill="#304734">Your habits</text><text x="537" y="788" font-family="Arial" font-size="20" fill="#7b8b6c">See all</text>' + habits}${bottom}</svg>`,
  );
}
