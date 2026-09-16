import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronDown,
  Copy,
  ImagePlus,
  Layers,
  Plus,
  Smartphone,
  Trash2,
  X,
  Columns3,
  Rows3,
  Group,
  Ungroup,
} from "lucide-react";
import {
  type DesignObject,
  type Page,
  type Background,
  palettes,
  presets,
} from "./model";
import { ColorField, IconButton, NumberField, RangeField, Section } from "./ui";
export type InspectorProps = {
  page: Page;
  selected: DesignObject[];
  patchPage: (p: Partial<Page>, label?: string) => void;
  patchObjects: (p: Partial<DesignObject>, label?: string) => void;
  upload: (target: "screenshot" | "background" | "image") => void;
  remove: () => void;
  duplicate: () => void;
  align: (axis: string) => void;
  order: (where: string) => void;
  group: () => void;
  ungroup: () => void;
  close: () => void;
};
export default function Inspector({
  page,
  selected,
  patchPage,
  patchObjects,
  upload,
  remove,
  duplicate,
  align,
  order,
  group,
  ungroup,
  close,
}: InspectorProps) {
  const o = selected.length === 1 ? selected[0] : undefined;
  const b = page.background;
  const bg = (p: Partial<Background>) =>
    patchPage({ background: { ...b, ...p } }, "Background updated");
  const text = o?.kind === "text";
  return (
    <aside className="inspector">
      <div className="panel-heading">
        <h2>
          {selected.length
            ? selected.length === 1
              ? "Object properties"
              : `${selected.length} objects selected`
            : "Page properties"}
        </h2>
        <IconButton
          label="Close properties"
          className="mobile-close"
          onClick={close}
        >
          <X size={17} />
        </IconButton>
        <span className="tiny-icon desktop-only">
          {selected.length ? <Layers size={15} /> : <Columns3 size={15} />}
        </span>
      </div>
      <div className="inspector-scroll">
        {!selected.length ? (
          <>
            <Section title="Canvas size">
              <select
                aria-label="Canvas preset"
                className="full-select"
                value={presets.findIndex(
                  (p) => p.width === page.width && p.height === page.height,
                )}
                onChange={(e) => {
                  const p = presets[Number(e.target.value)];
                  if (p)
                    patchPage(
                      { width: p.width, height: p.height },
                      "Canvas resized",
                    );
                }}
              >
                <option value={-1}>Custom dimensions</option>
                {presets.map((p, i) => (
                  <option value={i} key={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="field-row">
                <NumberField
                  label="W"
                  value={page.width}
                  onChange={(v) =>
                    patchPage({ width: Math.round(v) }, "Canvas resized")
                  }
                  min={100}
                  max={8000}
                  suffix="px"
                />
                <span className="times">×</span>
                <NumberField
                  label="H"
                  value={page.height}
                  onChange={(v) =>
                    patchPage({ height: Math.round(v) }, "Canvas resized")
                  }
                  min={100}
                  max={8000}
                  suffix="px"
                />
              </div>
              <p className="field-note">
                <span className="green-dot" />
                {presets.some(
                  (p) => p.width === page.width && p.height === page.height,
                )
                  ? "Preset dimensions · ready to design"
                  : "Custom dimensions · exact-size export"}
              </p>
            </Section>
            <Section title="Background">
              <div className="segmented">
                <button
                  className={b.type === "solid" ? "selected" : ""}
                  onClick={() => bg({ type: "solid" })}
                >
                  Solid
                </button>
                <button
                  className={
                    ["linear", "radial"].includes(b.type) ? "selected" : ""
                  }
                  onClick={() => bg({ type: "linear" })}
                >
                  Gradient
                </button>
                <button
                  className={b.type === "image" ? "selected" : ""}
                  onClick={() => bg({ type: "image" })}
                >
                  Image
                </button>
              </div>
              {b.type === "solid" || b.type === "pattern" ? (
                <>
                  <label className="field-label">Fill color</label>
                  <ColorField
                    value={b.color}
                    onChange={(color) => bg({ color })}
                  />
                  <label className="field-label">Document colors</label>
                  <div className="swatches">
                    {palettes.slice(0, 6).map((c) => (
                      <button
                        key={c}
                        title={c}
                        aria-label={"Set background " + c}
                        style={{ background: c }}
                        className={b.color === c ? "chosen" : ""}
                        onClick={() => bg({ color: c })}
                      />
                    ))}
                  </div>
                  <button
                    className="text-action"
                    onClick={() =>
                      bg({ type: b.type === "pattern" ? "solid" : "pattern" })
                    }
                  >
                    {b.type === "pattern"
                      ? "Remove pattern"
                      : "+ Add a pattern"}
                  </button>
                </>
              ) : null}
              {["linear", "radial"].includes(b.type) && (
                <>
                  <select
                    className="full-select"
                    aria-label="Gradient type"
                    value={b.type}
                    onChange={(e) =>
                      bg({ type: e.target.value as Background["type"] })
                    }
                  >
                    <option value="linear">Linear gradient</option>
                    <option value="radial">Radial gradient</option>
                  </select>
                  {b.colors.map((c, i) => (
                    <div className="field-row" key={i}>
                      <ColorField
                        label={`Stop ${i + 1}`}
                        value={c}
                        onChange={(v) =>
                          bg({
                            colors: b.colors.map((c, j) => (i === j ? v : c)),
                          })
                        }
                      />
                      {b.colors.length > 2 && (
                        <IconButton
                          label="Remove color stop"
                          onClick={() =>
                            bg({ colors: b.colors.filter((_, j) => i !== j) })
                          }
                        >
                          <X size={14} />
                        </IconButton>
                      )}
                    </div>
                  ))}
                  <button
                    className="text-action"
                    disabled={b.colors.length >= 6}
                    onClick={() => bg({ colors: [...b.colors, "#e87b53"] })}
                  >
                    <Plus size={13} /> Add color stop
                  </button>
                  <RangeField
                    label="Angle"
                    value={b.angle}
                    max={360}
                    suffix="°"
                    onChange={(angle) => bg({ angle })}
                  />
                </>
              )}
              {b.type === "image" && (
                <>
                  <button
                    className="upload-area small"
                    onClick={() => upload("background")}
                  >
                    {b.src ? (
                      <img src={b.src} alt="Background" />
                    ) : (
                      <ImagePlus size={24} />
                    )}
                    <span>
                      {b.src ? "Replace background" : "Upload background"}
                    </span>
                  </button>
                  <RangeField
                    label="Blur"
                    value={b.blur}
                    max={50}
                    suffix="px"
                    onChange={(blur) => bg({ blur })}
                  />
                  <RangeField
                    label="Opacity"
                    value={b.opacity * 100}
                    onChange={(v) => bg({ opacity: v / 100 })}
                  />
                </>
              )}
              {b.type === "pattern" && (
                <>
                  <select
                    className="full-select"
                    aria-label="Pattern"
                    value={b.pattern}
                    onChange={(e) =>
                      bg({ pattern: e.target.value as Background["pattern"] })
                    }
                  >
                    <option value="dots">Dot pattern</option>
                    <option value="grid">Grid pattern</option>
                    <option value="waves">Waves pattern</option>
                  </select>
                  <ColorField
                    label="Pattern color"
                    value={b.colors[1]}
                    onChange={(c) =>
                      bg({ colors: [b.colors[0], c, ...b.colors.slice(2)] })
                    }
                  />
                </>
              )}
            </Section>
            <Section title="Page settings">
              <label className="field-label" htmlFor="page-name">
                Page name
              </label>
              <input
                className="text-input"
                id="page-name"
                value={page.name}
                onChange={(e) =>
                  patchPage({ name: e.target.value }, "Page renamed")
                }
              />
              <p className="muted-note">
                Select any object on the canvas to edit its appearance and
                position.
              </p>
            </Section>
            <div className="inspector-tip">
              <div className="tip-icon">✦</div>
              <strong>Made for the first impression.</strong>
              <p>Keep your headline short and let your app do the talking.</p>
              <span>A little tip from Zero</span>
            </div>
          </>
        ) : (
          <>
            {o && (
              <Section title="Layer">
                <input
                  className="text-input"
                  aria-label="Layer name"
                  value={o.name}
                  onChange={(e) =>
                    patchObjects({ name: e.target.value }, "Layer renamed")
                  }
                />
              </Section>
            )}
            <Section title="Alignment">
              <div className="alignment-tools">
                {[
                  { a: "left", i: AlignLeft },
                  { a: "center", i: AlignCenter },
                  { a: "right", i: AlignRight },
                  { a: "top", i: AlignStartVertical },
                  { a: "middle", i: AlignCenterVertical },
                  { a: "bottom", i: AlignEndVertical },
                ].map(({ a, i: I }) => (
                  <IconButton
                    label={"Align " + a}
                    key={a}
                    onClick={() => align(a)}
                  >
                    <I size={17} />
                  </IconButton>
                ))}
              </div>
              {selected.length > 1 && (
                <div className="field-row">
                  <button
                    className="secondary small"
                    onClick={() => align("horizontal")}
                  >
                    <Columns3 size={14} />
                    Distribute
                  </button>
                  <button
                    className="secondary small"
                    onClick={() => align("vertical")}
                  >
                    <Rows3 size={14} />
                    Distribute
                  </button>
                </div>
              )}
            </Section>
            {o && (
              <Section title="Position & size">
                <div className="field-row">
                  <NumberField
                    label="X"
                    value={o.x}
                    onChange={(x) => patchObjects({ x })}
                  />
                  <NumberField
                    label="Y"
                    value={o.y}
                    onChange={(y) => patchObjects({ y })}
                  />
                </div>
                <div className="field-row">
                  <NumberField
                    label="W"
                    value={o.width}
                    min={20}
                    onChange={(width) => patchObjects({ width })}
                  />
                  <NumberField
                    label="H"
                    value={o.height}
                    min={20}
                    onChange={(height) => patchObjects({ height })}
                  />
                </div>
                <div className="field-row">
                  <NumberField
                    label="↻"
                    value={o.rotation}
                    min={-360}
                    max={360}
                    suffix="°"
                    onChange={(rotation) => patchObjects({ rotation })}
                  />
                  <NumberField
                    label="Opacity"
                    value={o.opacity * 100}
                    min={0}
                    max={100}
                    suffix="%"
                    onChange={(v) => patchObjects({ opacity: v / 100 })}
                  />
                </div>
              </Section>
            )}
            {text && o && (
              <Section title="Typography">
                <textarea
                  aria-label="Text content"
                  className="text-input text-editor"
                  value={o.text}
                  onChange={(e) =>
                    patchObjects({ text: e.target.value }, "Text edited")
                  }
                />
                <select
                  className="full-select"
                  aria-label="Font family"
                  value={o.fontFamily}
                  onChange={(e) => patchObjects({ fontFamily: e.target.value })}
                >
                  {[
                    "Manrope",
                    "DM Sans",
                    "Playfair Display",
                    "Noto Sans Bengali",
                    "Arial",
                    "Georgia",
                  ].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                <div className="field-row">
                  <NumberField
                    label="Size"
                    min={8}
                    max={700}
                    value={o.fontSize || 60}
                    onChange={(fontSize) => patchObjects({ fontSize })}
                  />
                  <select
                    aria-label="Font weight"
                    className="full-select"
                    value={o.fontWeight}
                    onChange={(e) =>
                      patchObjects({ fontWeight: e.target.value })
                    }
                  >
                    <option value="normal">Regular</option>
                    <option value="bold">Bold</option>
                    <option value="italic">Italic</option>
                    <option value="bold italic">Bold italic</option>
                  </select>
                </div>
                <ColorField
                  value={o.fill}
                  onChange={(fill) => patchObjects({ fill })}
                />
                <div className="segmented">
                  {(["left", "center", "right"] as const).map((a, i) => (
                    <button
                      key={a}
                      aria-label={"Text align " + a}
                      className={o.align === a ? "selected" : ""}
                      onClick={() => patchObjects({ align: a })}
                    >
                      {i === 0 ? (
                        <AlignLeft size={16} />
                      ) : i === 1 ? (
                        <AlignCenter size={16} />
                      ) : (
                        <AlignRight size={16} />
                      )}
                    </button>
                  ))}
                </div>
                <div className="field-row">
                  <NumberField
                    label="Spacing"
                    value={o.letterSpacing || 0}
                    min={-20}
                    max={100}
                    onChange={(letterSpacing) =>
                      patchObjects({ letterSpacing })
                    }
                  />
                  <NumberField
                    label="Line"
                    value={o.lineHeight || 1.2}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onChange={(lineHeight) => patchObjects({ lineHeight })}
                  />
                </div>
                <button
                  className="text-action"
                  onClick={() => {
                    const lines = (o.text || "").split("\n");
                    const maxLine = Math.max(...lines.map((l) => l.length), 1);
                    patchObjects(
                      {
                        fontSize: Math.floor(
                          Math.min(
                            o.height / (lines.length * (o.lineHeight || 1.2)),
                            o.width / (maxLine * 0.57),
                          ),
                        ),
                      },
                      "Text auto-fit",
                    );
                  }}
                >
                  Auto-fit text to box
                </button>
                <NumberField
                  label="Outline"
                  value={o.strokeWidth || 0}
                  min={0}
                  max={15}
                  suffix="px"
                  onChange={(strokeWidth) =>
                    patchObjects({ strokeWidth, stroke: o.stroke || "#ffffff" })
                  }
                />
                {!!o.strokeWidth && (
                  <ColorField
                    value={o.stroke || "#ffffff"}
                    onChange={(stroke) => patchObjects({ stroke })}
                  />
                )}
              </Section>
            )}
            {o?.kind === "device" && (
              <Section title="Device frame">
                <button
                  className="secondary full"
                  onClick={() => upload("screenshot")}
                >
                  <ImagePlus size={16} />
                  {o.src ? "Replace screenshot" : "Upload screenshot"}
                </button>
                <select
                  className="full-select"
                  aria-label="Device style"
                  value={o.frame}
                  onChange={(e) =>
                    patchObjects({
                      frame: e.target.value as DesignObject["frame"],
                    })
                  }
                >
                  <option value="iphone">iPhone · Dynamic Island</option>
                  <option value="android">Android · Edge to edge</option>
                  <option value="none">No frame</option>
                </select>
                <ColorField
                  label="Frame color"
                  value={o.fill}
                  onChange={(fill) => patchObjects({ fill })}
                />
                <RangeField
                  label="3D perspective tilt"
                  value={o.tilt || 0}
                  min={-35}
                  max={35}
                  suffix="°"
                  onChange={(tilt) => patchObjects({ tilt })}
                />
              </Section>
            )}
            {o?.kind === "shape" && (
              <Section title="Appearance">
                <ColorField
                  value={o.fill}
                  onChange={(fill) => patchObjects({ fill })}
                />
                <NumberField
                  label="Stroke"
                  value={o.strokeWidth || 0}
                  min={0}
                  max={80}
                  onChange={(strokeWidth) =>
                    patchObjects({ strokeWidth, stroke: o.stroke || "#254e3b" })
                  }
                />
                {!!o.strokeWidth && (
                  <ColorField
                    value={o.stroke || "#254e3b"}
                    onChange={(stroke) => patchObjects({ stroke })}
                  />
                )}
              </Section>
            )}
            {o && (
              <Section title="Effects">
                <RangeField
                  label="Shadow"
                  value={o.shadow || 0}
                  max={100}
                  suffix="px"
                  onChange={(shadow) => patchObjects({ shadow })}
                />
                {o.kind !== "text" && (
                  <RangeField
                    label="Corner radius"
                    value={o.radius || 0}
                    max={150}
                    suffix="px"
                    onChange={(radius) => patchObjects({ radius })}
                  />
                )}
              </Section>
            )}
            {(o?.kind === "device" || o?.kind === "image") && (
              <Section title="Image adjustments" initialOpen={false}>
                <RangeField
                  label="Brightness"
                  value={(o.brightness || 0) * 100}
                  min={-50}
                  max={50}
                  onChange={(v) => patchObjects({ brightness: v / 100 })}
                />
                <RangeField
                  label="Contrast"
                  value={o.contrast || 0}
                  min={-50}
                  max={50}
                  onChange={(contrast) => patchObjects({ contrast })}
                />
                <RangeField
                  label="Saturation"
                  value={(o.saturation || 0) * 100}
                  min={-100}
                  max={100}
                  onChange={(v) => patchObjects({ saturation: v / 100 })}
                />
              </Section>
            )}
            <Section title="Arrange">
              <div className="field-row">
                <button
                  className="secondary small"
                  onClick={() => order("front")}
                >
                  <ArrowUpToLine size={14} />
                  To front
                </button>
                <button
                  className="secondary small"
                  onClick={() => order("back")}
                >
                  <ArrowDownToLine size={14} />
                  To back
                </button>
              </div>
              <div className="field-row">
                <button className="secondary small" onClick={duplicate}>
                  <Copy size={14} />
                  Duplicate
                </button>
                <button className="secondary small danger" onClick={remove}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
              {selected.length > 1 && (
                <button className="secondary full" onClick={group}>
                  <Group size={15} />
                  Group objects
                </button>
              )}
              {selected.some((o) => o.groupId) && (
                <button className="secondary full" onClick={ungroup}>
                  <Ungroup size={15} />
                  Ungroup
                </button>
              )}
            </Section>
          </>
        )}
      </div>
      <div className="inspector-footer">
        <Smartphone size={14} />
        <span>Designed for Google Play</span>
        <ChevronDown size={12} />
      </div>
    </aside>
  );
}
