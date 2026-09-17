import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Group,
  Text,
  Image as KImage,
  Circle,
  Ellipse,
  Line,
  Star,
  Arrow,
  Transformer,
} from "react-konva";
import Konva from "konva";
import { perspectiveCanvas } from "./perspective";
import type { KonvaEventObject } from "konva/lib/Node";
import { demoScreen, type DesignObject, type Page } from "./model";
import { cachePixelRatioForScale, isCoarsePointer } from "./perf";

function useImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    setImage(undefined);
    if (!src) return;
    let cancelled = false;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => {
      if (!cancelled) setImage(i);
    };
    i.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return image;
}
/** Cache resolution for a node, matched to its on-screen size. */
function nodeCacheRatio(node: Konva.Node) {
  return cachePixelRatioForScale(node.getStage()?.scaleX() ?? 1);
}
/**
 * Cover-cropping and 3D projection are the only reasons a node needs a
 * cached canvas. Konva allocates three canvases per cache at the device
 * pixel ratio, which used to reserve tens of megabytes per device mockup on
 * phones, so the cache only exists while filters are actually in use.
 */
function hasToneFilters(o: DesignObject) {
  return !!(o.brightness || o.contrast || o.saturation);
}
function useToneCache(
  ref: React.RefObject<Konva.Image | null>,
  o: DesignObject,
  image?: HTMLImageElement,
) {
  const active = hasToneFilters(o);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (image && active) {
      node.cache({ pixelRatio: nodeCacheRatio(node) });
      node.getLayer()?.batchDraw();
    } else if (node.isCached()) {
      node.clearCache();
      node.getLayer()?.batchDraw();
    }
  }, [
    ref,
    image,
    active,
    o.width,
    o.height,
    o.brightness,
    o.contrast,
    o.saturation,
  ]);
  return active;
}
function roundedPath(ctx: Konva.Context, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
}
const ImageContent = memo(function ImageContent({ o }: { o: DesignObject }) {
  const image = useImage(o.src);
  const ref = useRef<Konva.Image>(null);
  const filtered = useToneCache(ref, o, image);
  return (
    <Group
      clipFunc={(ctx) =>
        roundedPath(
          ctx,
          o.width,
          o.height,
          Math.min(o.radius || 0, o.width / 2, o.height / 2),
        )
      }
    >
      <KImage
        ref={ref}
        image={image}
        width={o.width}
        height={o.height}
        filters={
          filtered
            ? [
                Konva.Filters.Brighten,
                Konva.Filters.Contrast,
                Konva.Filters.HSL,
              ]
            : undefined
        }
        brightness={o.brightness || 0}
        contrast={o.contrast || 0}
        saturation={o.saturation || 0}
      />
    </Group>
  );
});
const Phone = memo(function Phone({ o }: { o: DesignObject }) {
  const src = useMemo(() => o.src || demoScreen(o.demo), [o.src, o.demo]);
  const image = useImage(src);
  const ref = useRef<Konva.Image>(null);
  const w = o.width,
    h = o.height;
  const inset = o.frame === "none" ? 0 : w * 0.026;
  const r = Math.min(
    w / 2,
    h / 2,
    o.frame === "none" ? o.radius || 0 : (o.radius ?? w * 0.115),
  );
  const faceRef = useRef<Konva.Group>(null);
  const [projected, setProjected] = useState<HTMLCanvasElement>();
  const padding = Math.ceil(Math.max((o.shadow || 0) * 3, w * 0.12, h * 0.1));
  const iw = w - inset * 2,
    ih = h - inset * 2;
  const filtered = useToneCache(ref, o, image);
  const crop = image
    ? (() => {
        const ratio = iw / ih;
        const ir = image.width / image.height;
        return ir > ratio
          ? {
              x: (image.width - image.height * ratio) / 2,
              y: 0,
              width: image.height * ratio,
              height: image.height,
            }
          : {
              x: 0,
              y: (image.height - image.width / ratio) / 2,
              width: image.width,
              height: image.width / ratio,
            };
      })()
    : undefined;
  useEffect(() => {
    if (!o.tilt || !faceRef.current || !image) {
      setProjected(undefined);
      return;
    }
    const copy = faceRef.current.clone({
      visible: true,
      x: 0,
      y: 0,
      opacity: 1,
    });
    copy.find("Image").forEach((node) => {
      if (hasToneFilters(o)) node.cache({ pixelRatio: nodeCacheRatio(node) });
    });
    const snapshot = copy.toCanvas({
      x: -padding,
      y: -padding,
      width: w + padding * 2,
      height: h + padding * 2,
      pixelRatio: 1,
    });
    copy.destroy();
    setProjected(perspectiveCanvas(snapshot, w, h, padding, o.tilt));
  }, [
    image,
    w,
    h,
    padding,
    o.tilt,
    o.frame,
    o.fill,
    o.radius,
    o.shadow,
    o.brightness,
    o.contrast,
    o.saturation,
  ]);
  return (
    <Group>
      <Group ref={faceRef} visible={!o.tilt}>
        {o.frame !== "none" && (
          <>
            <Rect
              x={-5}
              y={h * 0.2}
              width={10}
              height={h * 0.075}
              cornerRadius={4}
              fill={o.fill}
            />
            <Rect
              x={w - 5}
              y={h * 0.22}
              width={10}
              height={h * 0.1}
              cornerRadius={4}
              fill={o.fill}
            />
          </>
        )}
        <Rect
          width={w}
          height={h}
          fill={o.fill}
          cornerRadius={r}
          shadowColor="#1b3020"
          shadowBlur={o.shadow || 0}
          shadowOpacity={0.24}
          shadowOffsetY={(o.shadow || 0) * 0.6}
        />
        {o.frame !== "none" && (
          <Rect
            x={4}
            y={4}
            width={w - 8}
            height={h - 8}
            cornerRadius={r - 4}
            stroke="#747872"
            strokeWidth={3}
          />
        )}
        <Group
          x={inset}
          y={inset}
          clipFunc={(ctx) => roundedPath(ctx, iw, ih, Math.max(0, r - inset))}
        >
          <Rect width={iw} height={ih} fill="#fafbf6" />
          <KImage
            ref={ref}
            image={image}
            width={iw}
            height={ih}
            crop={crop}
            filters={
              filtered
                ? [
                    Konva.Filters.Brighten,
                    Konva.Filters.Contrast,
                    Konva.Filters.HSL,
                  ]
                : undefined
            }
            brightness={o.brightness || 0}
            contrast={o.contrast || 0}
            saturation={o.saturation || 0}
          />
        </Group>
        {o.frame === "iphone" && (
          <Rect
            x={w * 0.36}
            y={inset + 13}
            width={w * 0.28}
            height={w * 0.065}
            fill="#202420"
            cornerRadius={w * 0.04}
          />
        )}
        {o.frame === "android" && (
          <Circle x={w / 2} y={inset + 26} radius={12} fill="#202420" />
        )}
      </Group>
      {!!o.tilt && projected && (
        <KImage
          image={projected}
          x={-padding}
          y={-padding}
          width={w + padding * 2}
          height={h + padding * 2}
          hitFunc={(ctx, shape) => {
            ctx.beginPath();
            ctx.rect(padding, padding, w, h);
            ctx.closePath();
            ctx.fillStrokeShape(shape);
          }}
        />
      )}
    </Group>
  );
});
const ObjectContent = memo(function ObjectContent({ o }: { o: DesignObject }) {
  if (o.kind === "device") return <Phone o={o} />;
  if (o.kind === "image" || o.kind === "icon") return <ImageContent o={o} />;
  if (o.kind === "text")
    return (
      <Text
        text={o.text}
        width={o.width}
        height={o.height}
        fontSize={o.fontSize || 60}
        fontFamily={
          (o.fontFamily || "Manrope") + ", Noto Sans Bengali, sans-serif"
        }
        fontStyle={o.fontWeight || "normal"}
        fill={o.fill}
        align={o.align || "left"}
        lineHeight={o.lineHeight || 1.2}
        letterSpacing={o.letterSpacing || 0}
        stroke={o.stroke}
        strokeWidth={o.strokeWidth || 0}
        shadowColor="#000000"
        shadowBlur={o.shadow || 0}
        shadowOpacity={0.3}
        shadowOffsetY={(o.shadow || 0) / 3}
        wrap="word"
      />
    );
  const p = {
    fill: o.fill,
    stroke: o.stroke,
    strokeWidth: o.strokeWidth || 0,
    shadowBlur: o.shadow || 0,
    shadowOpacity: 0.2,
  };
  switch (o.shape) {
    case "circle":
      return (
        <Ellipse
          x={o.width / 2}
          y={o.height / 2}
          radiusX={o.width / 2}
          radiusY={o.height / 2}
          {...p}
        />
      );
    case "star":
      return (
        <Star
          x={o.width / 2}
          y={o.height / 2}
          numPoints={5}
          innerRadius={o.width * 0.24}
          outerRadius={o.width * 0.5}
          {...p}
        />
      );
    case "sparkle":
      return (
        <Star
          x={o.width / 2}
          y={o.height / 2}
          numPoints={8}
          innerRadius={o.width * 0.19}
          outerRadius={o.width * 0.5}
          {...p}
        />
      );
    case "blob":
      return (
        <Line
          points={[
            o.width * 0.5,
            0,
            o.width,
            0.2 * o.height,
            o.width * 0.85,
            o.height * 0.7,
            o.width * 0.6,
            o.height,
            o.width * 0.1,
            o.height * 0.85,
            0,
            o.height * 0.3,
          ]}
          tension={0.5}
          closed
          {...p}
        />
      );
    case "line":
      return (
        <Line
          points={[0, o.height / 2, o.width, o.height / 2]}
          stroke={o.fill}
          strokeWidth={o.strokeWidth || 8}
        />
      );
    case "arrow":
      return (
        <Arrow
          points={[0, o.height / 2, o.width - 20, o.height / 2]}
          fill={o.fill}
          stroke={o.fill}
          strokeWidth={o.strokeWidth || 8}
          pointerLength={30}
          pointerWidth={30}
        />
      );
    default:
      return (
        <Rect
          width={o.width}
          height={o.height}
          cornerRadius={o.radius || 0}
          {...p}
        />
      );
  }
});
/**
 * Dots and grids used to be one Konva node per line/dot — up to ~600 nodes
 * per page, rebuilt on every React render and re-drawn on every frame. A
 * single 60px tile painted as a fill pattern draws identically with one node.
 */
function usePatternTile(pattern: "dots" | "grid", color: string) {
  return useMemo(() => {
    const size = 60;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.fillStyle = color;
    if (pattern === "dots") {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(30, 30, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(size, 1);
      ctx.moveTo(1, 0);
      ctx.lineTo(1, size);
      ctx.stroke();
    }
    return canvas;
  }, [pattern, color]);
}
const Background = memo(function Background({
  page,
  transparent,
  scale,
}: {
  page: Page;
  transparent?: boolean;
  scale: number;
}) {
  const b = page.background,
    w = page.width,
    h = page.height;
  const image = useImage(b.src);
  const ref = useRef<Konva.Image>(null);
  const blurred = b.type === "image" && b.blur > 0;
  // The blur filter needs a cached canvas, and its radius is measured in
  // cache pixels. Scaling the radius by the cache ratio keeps the blur
  // looking the same on every device pixel ratio.
  const ratio = cachePixelRatioForScale(scale);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (image && blurred) {
      node.cache({ pixelRatio: nodeCacheRatio(node) });
      node.getLayer()?.batchDraw();
    } else if (node.isCached()) {
      node.clearCache();
      node.getLayer()?.batchDraw();
    }
  }, [image, blurred, w, h]);
  const tile = usePatternTile(
    b.pattern === "grid" ? "grid" : "dots",
    b.colors[1] || "#254e3b",
  );
  if (transparent) return null;
  const angle = (b.angle * Math.PI) / 180;
  const length = Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle));
  const dx = (Math.cos(angle) * length) / 2,
    dy = (Math.sin(angle) * length) / 2;
  const stops = b.colors.flatMap((c, i) => [
    i / Math.max(1, b.colors.length - 1),
    c,
  ]);
  return (
    <Group listening={false} name="page-background">
      <Rect
        width={w}
        height={h}
        fill={b.color}
        fillPriority={
          b.type === "linear"
            ? "linear-gradient"
            : b.type === "radial"
              ? "radial-gradient"
              : "color"
        }
        fillLinearGradientStartPoint={{ x: w / 2 - dx, y: h / 2 - dy }}
        fillLinearGradientEndPoint={{ x: w / 2 + dx, y: h / 2 + dy }}
        fillLinearGradientColorStops={stops}
        fillRadialGradientStartPoint={{ x: w / 2, y: h / 2 }}
        fillRadialGradientEndPoint={{ x: w / 2, y: h / 2 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndRadius={Math.max(w, h) * 0.65}
        fillRadialGradientColorStops={stops}
      />
      {b.type === "image" && image && (
        <KImage
          ref={ref}
          image={image}
          width={w}
          height={h}
          opacity={b.opacity}
          filters={blurred ? [Konva.Filters.Blur] : undefined}
          blurRadius={b.blur * ratio}
        />
      )}
      {b.type === "pattern" &&
        (b.pattern === "dots" || b.pattern === "grid") && (
          <Rect
            width={w}
            height={h}
            // Konva accepts a canvas tile; its config type only lists images.
            fillPatternImage={tile as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
          />
        )}
      {b.type === "pattern" &&
        b.pattern === "waves" &&
        Array.from({ length: Math.min(80, Math.ceil(h / 60)) }, (_, i) => (
          <Line
            key={i}
            points={Array.from({ length: Math.ceil(w / 60) + 1 }, (_, j) => [
              j * 60,
              i * 80 + Math.sin(j) * 22,
            ]).flat()}
            tension={0.5}
            stroke={b.colors[1]}
            opacity={0.3}
            strokeWidth={3}
          />
        ))}
    </Group>
  );
});
export type ArtboardProps = {
  page: Page;
  scale: number;
  active: boolean;
  selected: string[];
  onSelect: (ids: string[]) => void;
  onChange: (pageId: string, objects: DesignObject[]) => void;
  onActivate: (pageId: string) => void;
  onEditText: (pageId: string, id: string) => void;
  onContext: (pageId: string, e: { x: number; y: number }, id?: string) => void;
  register: (id: string, stage: Konva.Stage | null) => void;
  grid: boolean;
  preview?: boolean;
  transparent?: boolean;
  selectMode?: boolean;
  panMode?: boolean;
  /** Mount the stage only once the page scrolls near the viewport. */
  defer?: boolean;
  /** Bumped when webfonts finish loading so text is measured again. */
  fontEpoch?: number;
  /**
   * Set while the pan tool is moving an object, so the scroll container knows
   * not to pan the viewport at the same time.
   */
  panGrabRef: { current: boolean };
};
function Artboard({
  page,
  scale,
  active,
  selected,
  onSelect,
  onChange,
  onActivate,
  onEditText,
  onContext,
  register,
  grid,
  preview,
  transparent,
  selectMode,
  panMode,
  defer,
  fontEpoch,
  panGrabRef,
}: ArtboardProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const guideXRef = useRef<Konva.Line>(null);
  const guideYRef = useRef<Konva.Line>(null);
  const marqueeRef = useRef<Konva.Rect>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const boxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const guidesRef = useRef<{ x?: number; y?: number }>({});
  /** Id of the object the pan tool is currently moving, if any. */
  const [grab, setGrab] = useState<string | null>(null);
  const [mounted, setMounted] = useState(!defer);
  const dragStart = useRef<
    | {
        /** Start position of the dragged node; only the select tool sets it. */
        x?: number;
        y?: number;
        /** Pointer position when the move started, in page coordinates. */
        point?: { x: number; y: number };
        positions: { id: string; x: number; y: number }[];
        targets: { x: number; y: number; width: number; height: number }[];
      }
    | undefined
  >(undefined);
  useEffect(() => {
    if (mounted) return;
    if (!defer) {
      setMounted(true);
      return;
    }
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setMounted(true);
      },
      { rootMargin: "320px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [defer, mounted]);
  useEffect(() => {
    register(page.id, stageRef.current);
    return () => register(page.id, null);
  }, [page.id, register, mounted]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const nodes =
      active && !preview
        ? (selected
            .map((id) => stage.findOne("#o-" + id))
            .filter(Boolean) as Konva.Node[])
        : [];
    trRef.current?.nodes(nodes);
    trRef.current?.getLayer()?.batchDraw();
  }, [selected, active, page.objects, preview, mounted, fontEpoch]);
  /**
   * Guides and the marquee are painted straight into the overlay layer.
   * Setting them through React state meant re-rendering every object on the
   * page on every pointer frame, which is what made dragging crawl on
   * phones.
   */
  const paintGuides = (next: { x?: number; y?: number }) => {
    const previous = guidesRef.current;
    if (previous.x === next.x && previous.y === next.y) return;
    guidesRef.current = next;
    const x = guideXRef.current,
      y = guideYRef.current;
    if (x)
      next.x === undefined
        ? x.visible(false)
        : x.visible(true).points([next.x, 0, next.x, page.height]);
    if (y)
      next.y === undefined
        ? y.visible(false)
        : y.visible(true).points([0, next.y, page.width, next.y]);
    (x ?? y)?.getLayer()?.batchDraw();
  };
  const paintBox = (
    next: { x: number; y: number; w: number; h: number } | null,
  ) => {
    const node = marqueeRef.current;
    if (!node) return;
    if (!next) node.visible(false);
    else
      node
        .visible(true)
        .x(Math.min(next.x, next.x + next.w))
        .y(Math.min(next.y, next.y + next.h))
        .width(Math.abs(next.w))
        .height(Math.abs(next.h));
    node.getLayer()?.batchDraw();
  };
  useEffect(() => {
    guidesRef.current = {};
    guideXRef.current?.visible(false);
    guideYRef.current?.visible(false);
    paintBox(null);
  }, [page.objects, selected, scale]);
  const getPoint = () => {
    const p = stageRef.current?.getPointerPosition();
    return p ? { x: p.x / scale, y: p.y / scale } : null;
  };
  /**
   * Keep receiving pointer events even if the finger leaves the stage, so a
   * pan-tool move does not stop halfway. The stage helper is used instead of
   * the DOM one because Konva retargets pointer events to the capture target.
   */
  const initPointerCapture = (e: {
    evt: { pointerId: number };
    target: Konva.Node;
  }) => {
    try {
      e.target.getStage()?.setPointerCapture?.(e.evt.pointerId);
    } catch {
      /* not supported — the move just ends at the edge */
    }
  };
  /** Where the pointer of this event landed, in page coordinates. */
  const pressPoint = (e: { clientX: number; clientY: number }) => {
    const box = stageRef.current?.container().getBoundingClientRect();
    if (!box) return null;
    return {
      x: (e.clientX - box.left) / scale,
      y: (e.clientY - box.top) / scale,
    };
  };
  /**
   * The pan tool moves whatever object is under the pointer, like the move
   * tool in a drawing app; empty canvas still pans the viewport (that part is
   * handled by the `.canvas-viewport` element in App).
   */
  const grabObject = (id: string, e: { clientX: number; clientY: number }) => {
    const point = pressPoint(e);
    if (!point) return;
    // Grouped objects move together, exactly like dragging them with the
    // select tool.
    const object = page.objects.find((o) => o.id === id);
    const group = object?.groupId;
    dragStart.current = {
      point,
      positions: page.objects
        .filter((o) => o.id === id || (!!group && o.groupId === group))
        .filter((o) => !o.locked)
        .map((o) => ({ id: o.id, x: o.x, y: o.y })),
      targets: [],
    };
    setGrab(id);
  };
  const releaseObject = () => {
    dragStart.current = undefined;
    panGrabRef.current = false;
    setGrab(null);
    // Back to the "you can grab this" cursor if the pointer is still there.
    const container = stageRef.current?.container();
    if (container?.style.cursor === "grabbing") container.style.cursor = "grab";
  };
  /**
   * Writes the grabbed objects back to the project. The final position is read
   * from the Konva nodes, so it stays right no matter where the release came
   * from, and it lands as one history entry — a single undo puts it back.
   */
  const commitGrab = () => {
    const d = dragStart.current;
    if (!d) return;
    const objects = page.objects.map((o) => {
      if (!d.positions.some((pos) => pos.id === o.id)) return o;
      const node = stageRef.current?.findOne<Konva.Node>("#o-" + o.id);
      if (!node) return o;
      const x = Math.round(node.x()),
        y = Math.round(node.y());
      return x === o.x && y === o.y ? o : { ...o, x, y };
    });
    releaseObject();
    if (objects.some((o, i) => o !== page.objects[i]))
      onChange(page.id, objects);
  };
  /**
   * A pointer released outside the stage (or a cancelled gesture) would
   * otherwise leave the object stuck to the cursor.
   */
  useEffect(() => {
    if (!grab) return;
    const finish = () => commitGrab();
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  });
  const pick = (
    o: DesignObject,
    e: KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>,
  ) => {
    if (preview || panMode) return;
    onActivate(page.id);
    const group = o.groupId
      ? page.objects
          .filter((n) => n.groupId === o.groupId && !n.locked)
          .map((n) => n.id)
      : [o.id];
    const shift = ("shiftKey" in e.evt && e.evt.shiftKey) || selectMode;
    onSelect(
      shift
        ? selected.includes(o.id)
          ? selected.filter((id) => !group.includes(id))
          : [...new Set([...selected, ...group])]
        : group,
    );
  };
  const transform = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const objects = page.objects.map((o) => {
      if (!selected.includes(o.id)) return o;
      const node = stage.findOne("#o-" + o.id);
      if (!node) return o;
      const sx = node.scaleX(),
        sy = node.scaleY();
      const next = {
        ...o,
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        rotation: Math.round(node.rotation()),
        width: Math.max(20, Math.round(o.width * sx)),
        height: Math.max(20, Math.round(o.height * sy)),
        ...(o.kind === "text"
          ? { fontSize: Math.max(8, Math.round((o.fontSize || 60) * sy)) }
          : {}),
      };
      node.scale({ x: 1, y: 1 });
      return next;
    });
    onChange(page.id, objects);
  };
  const coarse = isCoarsePointer();
  if (!mounted)
    return (
      <div
        ref={hostRef}
        className="artboard-stage-host"
        style={{
          width: page.width * scale,
          height: page.height * scale,
          background: page.background.color,
        }}
      />
    );
  return (
    <div ref={hostRef} className="artboard-stage-host">
      <Stage
        width={page.width * scale}
        height={page.height * scale}
        scaleX={scale}
        scaleY={scale}
        ref={stageRef}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (!preview)
            onContext(page.id, { x: e.evt.clientX, y: e.evt.clientY });
        }}
        onPointerDown={(e) => {
          if (preview || panMode) return;
          if (e.target === e.target.getStage()) {
            onActivate(page.id);
            onSelect([]);
            const p = getPoint();
            if (p) {
              startRef.current = p;
              boxRef.current = { ...p, w: 0, h: 0 };
            }
          }
        }}
        onPointerMove={(e) => {
          // Pan tool: the grabbed object follows the pointer 1:1 — no
          // snapping, no page bounds, it simply goes where the pointer goes.
          const d = dragStart.current;
          if (grab && d?.point) {
            const point = pressPoint(e.evt);
            if (!point) return;
            const dx = point.x - d.point.x,
              dy = point.y - d.point.y;
            for (const pos of d.positions)
              stageRef.current
                ?.findOne<Konva.Node>("#o-" + pos.id)
                ?.position({ x: pos.x + dx, y: pos.y + dy });
            stageRef.current?.batchDraw();
            return;
          }
          if (!startRef.current) return;
          const p = getPoint();
          if (!p) return;
          const next = {
            x: startRef.current.x,
            y: startRef.current.y,
            w: p.x - startRef.current.x,
            h: p.y - startRef.current.y,
          };
          boxRef.current = next;
          paintBox(next);
        }}
        onPointerCancel={() => {
          if (grab) commitGrab();
          startRef.current = null;
          boxRef.current = null;
          paintBox(null);
        }}
        onPointerUp={() => {
          if (grab) {
            commitGrab();
            return;
          }
          const box = boxRef.current;
          if (box && Math.abs(box.w) + Math.abs(box.h) > 15) {
            const r = {
              x: Math.min(box.x, box.x + box.w),
              y: Math.min(box.y, box.y + box.h),
              width: Math.abs(box.w),
              height: Math.abs(box.h),
            };
            onSelect(
              page.objects
                .filter(
                  (o) =>
                    !o.locked &&
                    o.visible &&
                    Konva.Util.haveIntersection(r, {
                      x: o.x,
                      y: o.y,
                      width: o.width,
                      height: o.height,
                    }),
                )
                .map((o) => o.id),
            );
          }
          startRef.current = null;
          boxRef.current = null;
          paintBox(null);
        }}
      >
        <Layer>
          <Background page={page} transparent={transparent} scale={scale} />
          <Group
            clipX={0}
            clipY={0}
            clipWidth={page.width}
            clipHeight={page.height}
          >
            <Group key={"objects-" + (fontEpoch || 0)}>
              {page.objects
                .filter((o) => o.visible)
                .map((o) => (
                  <Group
                    key={o.id}
                    id={"o-" + o.id}
                    x={o.x}
                    y={o.y}
                    width={o.width}
                    height={o.height}
                    rotation={o.rotation}
                    opacity={o.opacity}
                    draggable={!o.locked && !panMode && !preview}
                    // Pan mode keeps objects listening: pressing one with the
                    // pan tool is how it gets moved. Empty canvas still pans
                    // the viewport, because there the hit test finds the stage
                    // and the press reaches the scroll container.
                    listening={!preview}
                    onPointerDown={(e) => {
                      if (!panMode) return;
                      // The press stops here so the viewport does not pan while
                      // an object is being moved.
                      e.cancelBubble = true;
                      panGrabRef.current = true;
                      initPointerCapture(e);
                      grabObject(o.id, e.evt);
                    }}
                    onMouseEnter={(e) => {
                      if (panMode && !preview)
                        e.target.getStage()!.container().style.cursor = "grab";
                    }}
                    onMouseLeave={(e) => {
                      if (panMode && !preview)
                        e.target.getStage()!.container().style.cursor = "";
                    }}
                    onClick={(e) => pick(o, e)}
                    onTap={(e) => pick(o, e)}
                    onDblClick={() => {
                      if (o.kind === "text") onEditText(page.id, o.id);
                    }}
                    onDblTap={() => {
                      if (o.kind === "text") onEditText(page.id, o.id);
                    }}
                    onContextMenu={(e) => {
                      e.cancelBubble = true;
                      e.evt.preventDefault();
                      onActivate(page.id);
                      onSelect([o.id]);
                      onContext(
                        page.id,
                        { x: e.evt.clientX, y: e.evt.clientY },
                        o.id,
                      );
                    }}
                    onDragStart={(e) => {
                      onActivate(page.id);
                      if (!selected.includes(o.id))
                        onSelect(
                          o.groupId
                            ? page.objects
                                .filter(
                                  (n) => n.groupId === o.groupId && !n.locked,
                                )
                                .map((n) => n.id)
                            : [o.id],
                        );
                      const ids = selected.includes(o.id)
                        ? selected
                        : o.groupId
                          ? page.objects
                              .filter((n) => n.groupId === o.groupId)
                              .map((n) => n.id)
                          : [o.id];
                      dragStart.current = {
                        x: e.target.x(),
                        y: e.target.y(),
                        positions: page.objects
                          .filter((n) => ids.includes(n.id) && !n.locked)
                          .map((n) => ({ id: n.id, x: n.x, y: n.y })),
                        targets: page.objects.filter(
                          (t) =>
                            t.id !== o.id &&
                            !selected.includes(t.id) &&
                            t.visible,
                        ),
                      };
                    }}
                    onDragMove={(e) => {
                      const n = e.target;
                      const d = dragStart.current;
                      const g: { x?: number; y?: number } = {};
                      if (Math.abs(n.x() + o.width / 2 - page.width / 2) < 14) {
                        n.x(page.width / 2 - o.width / 2);
                        g.x = page.width / 2;
                      } else if (d)
                        for (const t of d.targets)
                          if (
                            Math.abs(
                              n.x() + o.width / 2 - (t.x + t.width / 2),
                            ) < 14
                          ) {
                            n.x(t.x + t.width / 2 - o.width / 2);
                            g.x = t.x + t.width / 2;
                            break;
                          }
                      if (
                        Math.abs(n.y() + o.height / 2 - page.height / 2) < 14
                      ) {
                        n.y(page.height / 2 - o.height / 2);
                        g.y = page.height / 2;
                      } else if (d)
                        for (const t of d.targets)
                          if (
                            Math.abs(
                              n.y() + o.height / 2 - (t.y + t.height / 2),
                            ) < 14
                          ) {
                            n.y(t.y + t.height / 2 - o.height / 2);
                            g.y = t.y + t.height / 2;
                            break;
                          }
                      paintGuides(g);
                      if (d && d.x !== undefined && d.y !== undefined)
                        d.positions.forEach((p) => {
                          if (p.id !== o.id)
                            stageRef.current?.findOne("#o-" + p.id)?.position({
                              x: p.x + n.x() - d.x!,
                              y: p.y + n.y() - d.y!,
                            });
                        });
                    }}
                    onDragEnd={(e) => {
                      const d = dragStart.current;
                      paintGuides({});
                      const startX = d?.x ?? e.target.x(),
                        startY = d?.y ?? e.target.y();
                      onChange(
                        page.id,
                        page.objects.map((n) => {
                          const p = d?.positions.find((p) => p.id === n.id);
                          return p
                            ? {
                                ...n,
                                x: Math.round(p.x + e.target.x() - startX),
                                y: Math.round(p.y + e.target.y() - startY),
                              }
                            : n;
                        }),
                      );
                      dragStart.current = undefined;
                    }}
                  >
                    <ObjectContent o={o} />
                  </Group>
                ))}
            </Group>
          </Group>
        </Layer>
        {!preview && (
          <Layer name="editor-overlay" listening>
            {grid && (
              <Group listening={false}>
                {Array.from({ length: Math.ceil(page.width / 100) }, (_, i) => (
                  <Line
                    key={"gx" + i}
                    points={[i * 100, 0, i * 100, page.height]}
                    stroke="#596e8050"
                    strokeWidth={1 / scale}
                  />
                ))}
                {Array.from(
                  { length: Math.ceil(page.height / 100) },
                  (_, i) => (
                    <Line
                      key={"gy" + i}
                      points={[0, i * 100, page.width, i * 100]}
                      stroke="#596e8050"
                      strokeWidth={1 / scale}
                    />
                  ),
                )}
              </Group>
            )}
            <Line
              ref={guideXRef}
              visible={false}
              points={[0, 0, 0, page.height]}
              stroke="#e77b53"
              strokeWidth={1 / scale}
              dash={[10, 10]}
            />
            <Line
              ref={guideYRef}
              visible={false}
              points={[0, 0, page.width, 0]}
              stroke="#e77b53"
              strokeWidth={1 / scale}
              dash={[10, 10]}
            />
            <Rect
              ref={marqueeRef}
              visible={false}
              fill="#e87b5322"
              stroke="#e87b53"
              strokeWidth={1 / scale}
            />
            <Transformer
              ref={trRef}
              onTransformEnd={transform}
              rotateEnabled={
                !selected.some(
                  (id) => page.objects.find((o) => o.id === id)?.locked,
                )
              }
              resizeEnabled={
                !selected.some(
                  (id) => page.objects.find((o) => o.id === id)?.locked,
                )
              }
              borderStroke="#e87b53"
              anchorStroke="#e87b53"
              anchorFill="white"
              anchorSize={coarse ? 14 : 8}
              anchorCornerRadius={2}
              anchorStyleFunc={(anchor) =>
                anchor.hitStrokeWidth(coarse ? 26 : 8)
              }
              borderStrokeWidth={1.5}
              rotateAnchorOffset={25}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              flipEnabled={false}
              boundBoxFunc={(old, next) =>
                Math.abs(next.width) < 20 || Math.abs(next.height) < 20
                  ? old
                  : next
              }
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
}
export default memo(Artboard, (a, b) => {
  if (a.page !== b.page || a.scale !== b.scale) return false;
  if (
    a.active !== b.active ||
    a.grid !== b.grid ||
    a.preview !== b.preview ||
    a.transparent !== b.transparent ||
    a.selectMode !== b.selectMode ||
    a.panMode !== b.panMode ||
    a.defer !== b.defer ||
    a.fontEpoch !== b.fontEpoch
  )
    return false;
  const s1 = a.selected,
    s2 = b.selected;
  if (s1 !== s2) {
    if (s1.length !== s2.length) return false;
    for (let i = 0; i < s1.length; i++) if (s1[i] !== s2[i]) return false;
  }
  return true;
});
