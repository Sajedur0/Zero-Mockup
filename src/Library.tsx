import { lazy, Suspense, useState } from "react";
import {
  Search,
  ArrowUpRight,
  Upload,
  Plus,
  Type,
  Heading1,
  Heading2,
  RectangleHorizontal,
  Circle,
  MoveRight,
  Minus,
  Star,
  Sparkles,
  Eye,
  EyeOff,
  LockKeyhole,
  LockKeyholeOpen,
  GripVertical,
  Smartphone,
  Image,
  X,
  Check,
  History,
} from "lucide-react";
import {
  baseObject,
  templateInfo,
  demoScreen,
  type DesignObject,
  type Project,
  type Page,
} from "./model";
import type { HistoryEntry } from "./useProject";
import { ColorField, IconButton } from "./ui";
const IconLibrary = lazy(() => import("./IconLibrary"));
export type Tool =
  | "templates"
  | "frames"
  | "text"
  | "elements"
  | "uploads"
  | "brand"
  | "layers"
  | "history";
export type LibraryProps = {
  tool: Tool;
  project: Project;
  page: Page;
  selected: string[];
  select: (ids: string[]) => void;
  apply: (i: number) => void;
  add: (o: DesignObject) => void;
  upload: (target: "screenshot" | "background" | "image") => void;
  patch: (id: string, p: Partial<DesignObject>) => void;
  updateBrand: (b: Project["brand"]) => void;
  history: HistoryEntry[];
  historyIndex: number;
  restore: (i: number) => void;
  close: () => void;
  assets: string[];
};
export function TemplateThumb({
  index,
  onClick,
  chosen = false,
}: {
  index: number;
  onClick: () => void;
  chosen?: boolean;
}) {
  const t = templateInfo[index];
  return (
    <button
      className={`template-card ${chosen ? "chosen" : ""}`}
      onClick={onClick}
      aria-label={"Apply " + t.name + " template"}
    >
      <div
        className="template-art"
        style={{
          background: t.colors[0],
          color: t.dark ? "#eef4dc" : "#293e31",
        }}
      >
        <span className="template-brand">✳ {t.tag}</span>
        <strong>{t.headline}</strong>
        <span className="template-sub">{t.sub}</span>
        <div className="template-phone">
          <img src={demoScreen(index % 3)} alt="" />
        </div>
        <span className="template-sparkle">✳</span>
        {chosen && (
          <span className="template-check">
            <Check size={10} />
          </span>
        )}
      </div>
      <div className="template-title">{t.name}</div>
      <span className="template-category">{t.category}</span>
    </button>
  );
}
export default function Library({
  tool,
  project,
  page,
  selected,
  select,
  apply,
  add,
  upload,
  patch,
  updateBrand,
  history,
  historyIndex,
  restore,
  close,
  assets,
}: LibraryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All templates");
  const [elementsTab, setElementsTab] = useState("Shapes");
  const [brandColor, setBrandColor] = useState("#e87b53");
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const title = {
    templates: "Templates",
    frames: "Device frames",
    text: "Text",
    elements: "Elements",
    uploads: "Uploads",
    brand: "Brand kit",
    layers: "Layers",
    history: "Version history",
  }[tool];
  return (
    <aside className="library">
      <div className="panel-heading">
        <h2>{title}</h2>
        <IconButton label="Collapse tools panel" onClick={close}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="library-scroll">
        {tool === "templates" && (
          <>
            <p className="panel-intro">A head start for your next big thing.</p>
            <div className="search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search templates"
                placeholder="Search templates"
              />
              <kbd>⌘ K</kbd>
            </div>
            <div className="template-filter">
              <select
                aria-label="Template category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "All templates",
                  "Wellness",
                  "Lifestyle",
                  "Fitness",
                  "Finance",
                  "Productivity",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <span>
                {
                  templateInfo.filter(
                    (t) =>
                      (category === "All templates" ||
                        t.category === category) &&
                      (t.name + " " + t.category)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  ).length
                }{" "}
                templates
              </span>
            </div>
            <div className="template-grid">
              {templateInfo.map((t, i) =>
                (category === "All templates" || t.category === category) &&
                (t.name + " " + t.category)
                  .toLowerCase()
                  .includes(search.toLowerCase()) ? (
                  <TemplateThumb
                    key={t.name}
                    index={i}
                    onClick={() => apply(i)}
                    chosen={page.background.color === t.colors[0]}
                  />
                ) : null,
              )}
            </div>
            {!templateInfo.some(
              (t) =>
                (category === "All templates" || t.category === category) &&
                (t.name + " " + t.category)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            ) && (
              <div className="empty-state">
                No templates found.
                <br />
                Try another search or category.
              </div>
            )}
            <div className="template-bottom">
              <Sparkles size={15} />
              <span>Your app. Your own look.</span>
              <ArrowUpRight size={14} />
            </div>
            <p className="muted-note">
              Every template is fully customizable.
              <br />
              Make it feel like you.
            </p>
          </>
        )}
        {tool === "frames" && (
          <>
            <p className="panel-intro">Give your app the perfect home.</p>
            <button
              className="primary full"
              onClick={() => upload("screenshot")}
            >
              <Upload size={16} />
              Upload a screenshot
            </button>
            <div className="frame-grid">
              {(["iphone", "android", "none"] as const).map((f, i) => (
                <button
                  className="frame-card"
                  key={f}
                  onClick={() =>
                    add(
                      baseObject("device", {
                        name:
                          f === "iphone"
                            ? "iPhone frame"
                            : f === "android"
                              ? "Android frame"
                              : "Frameless screenshot",
                        x: 200,
                        y: 620,
                        width: 700,
                        height: 1450,
                        frame: f,
                        radius: f === "none" ? 20 : 85,
                        shadow: 35,
                        fill: "#252b27",
                        demo: i,
                      }),
                    )
                  }
                >
                  <div className={"frame-preview " + f}>
                    <img src={demoScreen(i)} alt="" />
                    {f !== "none" && <i />}
                  </div>
                  <strong>
                    {f === "iphone"
                      ? "iPhone"
                      : f === "android"
                        ? "Modern Android"
                        : "No frame"}
                  </strong>
                  <span>
                    {f === "iphone"
                      ? "Dynamic Island"
                      : f === "android"
                        ? "Edge to edge"
                        : "Let your app shine"}
                  </span>
                  <Plus size={15} />
                </button>
              ))}
            </div>
            <div className="info-card">
              <Smartphone size={19} />
              <p>
                Upload your screenshot, then adjust the frame, shadow and
                perspective in Properties.
              </p>
            </div>
          </>
        )}
        {tool === "text" && (
          <>
            <p className="panel-intro">Say more. Make it memorable.</p>
            <button
              className="primary full"
              onClick={() =>
                add(
                  baseObject("text", {
                    name: "Text",
                    text: "Your next big idea",
                    fontFamily: project.brand.font,
                    fontSize: 60,
                    fontWeight: "normal",
                    width: 850,
                    height: 160,
                  }),
                )
              }
            >
              <Plus size={16} />
              Add a text box
            </button>
            <div className="text-presets">
              {[
                {
                  label: "Add a heading",
                  size: 100,
                  icon: Heading1,
                  weight: "bold",
                },
                {
                  label: "Add a subheading",
                  size: 55,
                  icon: Heading2,
                  weight: "normal",
                },
                {
                  label: "Add body text",
                  size: 34,
                  icon: Type,
                  weight: "normal",
                },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={() =>
                    add(
                      baseObject("text", {
                        name: t.label.replace("Add a ", ""),
                        text: t.label
                          .replace("Add a ", "Your ")
                          .replace("Add body", "Your body"),
                        width: 880,
                        height: t.size * 2,
                        fontSize: t.size,
                        fontFamily: project.brand.font,
                        fontWeight: t.weight,
                      }),
                    )
                  }
                >
                  <t.icon size={20} />
                  <span
                    style={{
                      fontSize: t.size / 5 + 8,
                      fontWeight: t.weight === "bold" ? 750 : 450,
                    }}
                  >
                    {t.label}
                  </span>
                  <Plus size={14} />
                </button>
              ))}
            </div>
            <h3 className="mini-heading">FONT PAIRINGS</h3>
            {[
              { a: "Make it matter.", b: "MANROPE + DM SANS", font: "Manrope" },
              {
                a: "A beautiful beginning.",
                b: "PLAYFAIR DISPLAY + DM SANS",
                font: "Playfair Display",
              },
              {
                a: "নিজের মতো করে।",
                b: "NOTO SANS BENGALI",
                font: "Noto Sans Bengali",
              },
            ].map((t) => (
              <button
                className="font-pair"
                key={t.font}
                onClick={() =>
                  add(
                    baseObject("text", {
                      name: "Styled heading",
                      text: t.a,
                      fontFamily: t.font,
                      fontSize: 85,
                      fontWeight: "bold",
                      width: 880,
                      height: 240,
                    }),
                  )
                }
              >
                <strong style={{ fontFamily: t.font }}>{t.a}</strong>
                <span>{t.b}</span>
              </button>
            ))}
          </>
        )}
        {tool === "elements" && (
          <>
            <p className="panel-intro">The little details make it yours.</p>
            <div className="segmented">
              {["Shapes", "Icons"].map((t) => (
                <button
                  className={elementsTab === t ? "selected" : ""}
                  key={t}
                  onClick={() => setElementsTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {elementsTab === "Icons" ? (
              <Suspense
                fallback={<p className="empty-state">Loading icon library…</p>}
              >
                <IconLibrary add={add} />
              </Suspense>
            ) : (
              <>
                <h3 className="mini-heading">BASIC SHAPES</h3>
                <div className="shape-grid">
                  {[
                    {
                      name: "Rectangle",
                      shape: "rectangle",
                      icon: RectangleHorizontal,
                    },
                    { name: "Circle", shape: "circle", icon: Circle },
                    { name: "Line", shape: "line", icon: Minus },
                    { name: "Arrow", shape: "arrow", icon: MoveRight },
                    { name: "Star", shape: "star", icon: Star },
                    { name: "Sparkle", shape: "sparkle", icon: Sparkles },
                  ].map(({ name, shape, icon: I }) => (
                    <button
                      key={shape}
                      onClick={() =>
                        add(
                          baseObject("shape", {
                            name,
                            shape,
                            width: 300,
                            height:
                              shape === "arrow" || shape === "line" ? 60 : 300,
                            fill: project.brand.colors[0] || "#254e3b",
                          }),
                        )
                      }
                    >
                      <I size={30} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
                <h3 className="mini-heading">A LITTLE EXTRA</h3>
                <button
                  className="blob-preset"
                  onClick={() =>
                    add(
                      baseObject("shape", {
                        name: "Organic blob",
                        shape: "blob",
                        width: 600,
                        height: 560,
                        fill: "#d3dfbf",
                      }),
                    )
                  }
                >
                  <span />
                  Organic shapes
                  <Plus size={14} />
                </button>
                <div className="badge-presets">
                  {["NEW", "UPDATE", "★ 4.9", "100% YOU"].map((b, i) => (
                    <button
                      style={{
                        background: [
                          "#e7efdb",
                          "#f7e6db",
                          "#ebe5f5",
                          "#f5eabf",
                        ][i],
                      }}
                      key={b}
                      onClick={() =>
                        add(
                          baseObject("text", {
                            name: "Badge " + b,
                            text: b,
                            fontSize: 52,
                            fontWeight: "bold",
                            width: 420,
                            height: 100,
                            fontFamily: "Manrope",
                            fill: "#36523d",
                          }),
                        )
                      }
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {tool === "uploads" && (
          <>
            <p className="panel-intro">Your app is the star of the show.</p>
            <button className="upload-area" onClick={() => upload("image")}>
              <span className="upload-icon">
                <Upload size={23} />
              </span>
              <strong>Drop it like it’s yours</strong>
              <span>Click to upload an image</span>
              <small>PNG, JPG, WebP or SVG · up to 15 MB</small>
            </button>
            <button
              className="secondary full"
              onClick={() => upload("screenshot")}
            >
              <Smartphone size={16} />
              Upload to device frame
            </button>
            <h3 className="mini-heading">YOUR IMAGES</h3>
            {assets.length ? (
              <div className="asset-grid">
                {assets.map((src, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      add(
                        baseObject("image", {
                          name: "Uploaded image " + (i + 1),
                          src,
                          width: 600,
                          height: 600,
                        }),
                      )
                    }
                  >
                    <img src={src} alt={"Uploaded asset " + (i + 1)} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Image size={28} />
                <p>
                  A home for your screenshots,
                  <br />
                  logos and little extras.
                </p>
              </div>
            )}
          </>
        )}
        {tool === "brand" && (
          <>
            <p className="panel-intro">A consistent look, on every page.</p>
            <h3 className="mini-heading">YOUR COLORS</h3>
            <div className="brand-colors">
              {project.brand.colors.map((c, i) => (
                <div key={i}>
                  <button
                    style={{ background: c }}
                    title={"Add shape in " + c}
                    onClick={() =>
                      add(
                        baseObject("shape", {
                          name: "Brand color",
                          shape: "circle",
                          fill: c,
                          width: 250,
                          height: 250,
                        }),
                      )
                    }
                  />
                  <span>{c}</span>
                  <IconButton
                    label={"Remove brand color " + c}
                    onClick={() =>
                      updateBrand({
                        ...project.brand,
                        colors: project.brand.colors.filter((_, j) => i !== j),
                      })
                    }
                  >
                    <X size={12} />
                  </IconButton>
                </div>
              ))}
            </div>
            <ColorField value={brandColor} onChange={setBrandColor} />
            <button
              className="secondary full"
              disabled={project.brand.colors.length >= 24}
              onClick={() =>
                updateBrand({
                  ...project.brand,
                  colors: [...project.brand.colors, brandColor],
                })
              }
            >
              <Plus size={15} />
              Add brand color
            </button>
            <h3 className="mini-heading">BRAND FONT</h3>
            <select
              className="full-select"
              aria-label="Brand font"
              value={project.brand.font}
              onChange={(e) =>
                updateBrand({ ...project.brand, font: e.target.value })
              }
            >
              {[
                "Manrope",
                "DM Sans",
                "Playfair Display",
                "Noto Sans Bengali",
              ].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <div
              className="brand-font-preview"
              style={{ fontFamily: project.brand.font }}
            >
              Aa Bb Cc<span>The beginning of something good.</span>
            </div>
            <p className="muted-note">
              Your brand kit is saved with this project. New text uses your
              brand font.
            </p>
          </>
        )}
        {tool === "layers" && (
          <>
            <p className="panel-intro">Everything, in its right place.</p>
            <div className="layer-page-label">
              <span>{page.name}</span>
              <span>{page.objects.length} layers</span>
            </div>
            <div className="layer-list">
              {[...page.objects].reverse().map((o) => (
                <div
                  key={o.id}
                  className={`layer-item ${selected.includes(o.id) ? "selected" : ""} ${!o.visible ? "hidden-layer" : ""}`}
                  onDoubleClick={() => setEditingLayer(o.id)}
                  onClick={(e) =>
                    select(
                      e.shiftKey ? [...new Set([...selected, o.id])] : [o.id],
                    )
                  }
                >
                  <GripVertical size={12} />
                  <span className="layer-kind">
                    {o.kind === "text" ? (
                      <Type size={16} />
                    ) : o.kind === "device" ? (
                      <Smartphone size={16} />
                    ) : o.kind === "image" ? (
                      <Image size={16} />
                    ) : (
                      <RectangleHorizontal size={16} />
                    )}
                  </span>
                  {editingLayer === o.id ? (
                    <input
                      autoFocus
                      aria-label={"Rename " + o.name}
                      value={o.name}
                      onChange={(e) => patch(o.id, { name: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => setEditingLayer(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape")
                          e.currentTarget.blur();
                      }}
                    />
                  ) : (
                    <span className="layer-name" title="Double-click to rename">
                      {o.name}
                    </span>
                  )}
                  <button
                    aria-label={o.visible ? "Hide " + o.name : "Show " + o.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      patch(o.id, { visible: !o.visible });
                    }}
                  >
                    {o.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    aria-label={
                      o.locked ? "Unlock " + o.name : "Lock " + o.name
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      patch(o.id, { locked: !o.locked });
                    }}
                  >
                    {o.locked ? (
                      <LockKeyhole size={13} />
                    ) : (
                      <LockKeyholeOpen size={13} />
                    )}
                  </button>
                </div>
              ))}
            </div>
            <p className="muted-note">
              Shift-click to select multiple layers. Use the Arrange controls to
              change their order.
            </p>
          </>
        )}
        {tool === "history" && (
          <>
            <p className="panel-intro">A little room to change your mind.</p>
            <div className="history-list">
              {history.map((h, i) => (
                <button
                  key={i}
                  className={i === historyIndex ? "current" : ""}
                  onClick={() => restore(i)}
                >
                  <History size={16} />
                  <span>
                    {h.label}
                    <small>
                      {i === historyIndex ? "Current version" : `Step ${i + 1}`}
                    </small>
                  </span>
                  {i === historyIndex && <Check size={14} />}
                </button>
              ))}
            </div>
            <p className="muted-note">
              Up to 70 recent changes are kept during this session.
            </p>
          </>
        )}
      </div>
      <div className="library-footer">
        <span className="zero-small">z.</span>
        <span>
          A little less effort.
          <br />
          <strong>A lot more possibility.</strong>
        </span>
      </div>
    </aside>
  );
}
