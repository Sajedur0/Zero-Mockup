import { useEffect, useMemo, useRef, useState } from "react";
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
function roundedPath(ctx: Konva.Context, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
}
function ImageContent({ o }: { o: DesignObject }) {
  const image = useImage(o.src);
  const ref = useRef<Konva.Image>(null);
  useEffect(() => {
    if (ref.current && image) {
      ref.current.cache();
      ref.current.getLayer()?.batchDraw();
    }
  }, [image, o.width, o.height, o.brightness, o.contrast, o.saturation]);
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
        filters={[
          Konva.Filters.Brighten,
          Konva.Filters.Contrast,
          Konva.Filters.HSL,
        ]}
        brightness={o.brightness || 0}
        contrast={o.contrast || 0}
        saturation={o.saturation || 0}
      />
    </Group>
  );
}
function Phone({ o }: { o: DesignObject }) {
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
    if (ref.current && image) {
      ref.current.cache();
      ref.current.getLayer()?.batchDraw();
    }
  }, [image, w, h, o.brightness, o.contrast, o.saturation]);
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
    copy.find("Image").forEach((node) => node.cache());
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
            filters={[
              Konva.Filters.Brighten,
              Konva.Filters.Contrast,
              Konva.Filters.HSL,
            ]}
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
}
function ObjectContent({ o }: { o: DesignObject }) {
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
}
function Background({
  page,
  transparent,
}: {
  page: Page;
  transparent?: boolean;
}) {
  const b = page.background,
    w = page.width,
    h = page.height;
  const image = useImage(b.src);
  const ref = useRef<Konva.Image>(null);
  useEffect(() => {
    if (ref.current && image) {
      ref.current.cache();
      ref.current.getLayer()?.batchDraw();
    }
  }, [image, b.blur, b.type, w, h]);
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
          filters={[Konva.Filters.Blur]}
          blurRadius={b.blur}
        />
      )}
      {b.type === "pattern" &&
        Array.from({ length: Math.min(80, Math.ceil(h / 60)) }, (_, i) =>
          b.pattern === "dots" ? (
            Array.from({ length: Math.min(80, Math.ceil(w / 60)) }, (_, j) => (
              <Circle
                key={`${i}-${j}`}
                x={j * 60 + 30}
                y={i * 60 + 30}
                radius={3}
                fill={b.colors[1] || "#254e3b"}
                opacity={0.35}
              />
            ))
          ) : b.pattern === "grid" ? (
            <Line
              key={i}
              points={[0, i * 60, w, i * 60]}
              stroke={b.colors[1]}
              opacity={0.2}
              strokeWidth={2}
            />
          ) : (
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
          ),
        )}
      {b.type === "pattern" &&
        b.pattern === "grid" &&
        Array.from({ length: Math.min(80, Math.ceil(w / 60)) }, (_, i) => (
          <Line
            key={"v" + i}
            points={[i * 60, 0, i * 60, h]}
            stroke={b.colors[1]}
            opacity={0.2}
            strokeWidth={2}
          />
        ))}
    </Group>
  );
}
export type ArtboardProps = {
  page: Page;
  scale: number;
  active: boolean;
  selected: string[];
  onSelect: (ids: string[]) => void;
  onChange: (objects: DesignObject[]) => void;
  onActivate: () => void;
  onEditText: (id: string) => void;
  onContext: (e: { x: number; y: number }, id?: string) => void;
  register: (id: string, stage: Konva.Stage | null) => void;
  grid: boolean;
  preview?: boolean;
  transparent?: boolean;
  selectMode?: boolean;
  panMode?: boolean;
};
export default function Artboard({
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
}: ArtboardProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<
    | {
        x: number;
        y: number;
        positions: { id: string; x: number; y: number }[];
      }
    | undefined
  >(undefined);
  useEffect(() => {
    register(page.id, stageRef.current);
    return () => register(page.id, null);
  }, [page.id, register]);
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
  }, [selected, active, page.objects, preview]);
  const getPoint = () => {
    const p = stageRef.current?.getPointerPosition();
    return p ? { x: p.x / scale, y: p.y / scale } : null;
  };
  const pick = (
    o: DesignObject,
    e: KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>,
  ) => {
    if (preview || panMode) return;
    onActivate();
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
    onChange(objects);
  };
  return (
    <Stage
      width={page.width * scale}
      height={page.height * scale}
      scaleX={scale}
      scaleY={scale}
      ref={stageRef}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        if (!preview) onContext({ x: e.evt.clientX, y: e.evt.clientY });
      }}
      onPointerDown={(e) => {
        if (preview || panMode) return;
        if (e.target === e.target.getStage()) {
          onActivate();
          onSelect([]);
          const p = getPoint();
          if (p) {
            startRef.current = p;
            setBox({ ...p, w: 0, h: 0 });
          }
        }
      }}
      onPointerMove={() => {
        if (!startRef.current) return;
        const p = getPoint();
        if (p)
          setBox({
            x: startRef.current.x,
            y: startRef.current.y,
            w: p.x - startRef.current.x,
            h: p.y - startRef.current.y,
          });
      }}
      onPointerUp={() => {
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
        setBox(null);
      }}
    >
      <Layer>
        <Background page={page} transparent={transparent} />
        <Group
          clipX={0}
          clipY={0}
          clipWidth={page.width}
          clipHeight={page.height}
        >
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
                draggable={!o.locked && !preview && !panMode}
                listening={!preview && !panMode}
                onClick={(e) => pick(o, e)}
                onTap={(e) => pick(o, e)}
                onDblClick={() => {
                  if (o.kind === "text") onEditText(o.id);
                }}
                onDblTap={() => {
                  if (o.kind === "text") onEditText(o.id);
                }}
                onContextMenu={(e) => {
                  e.cancelBubble = true;
                  e.evt.preventDefault();
                  onActivate();
                  onSelect([o.id]);
                  onContext({ x: e.evt.clientX, y: e.evt.clientY }, o.id);
                }}
                onDragStart={(e) => {
                  onActivate();
                  if (!selected.includes(o.id))
                    onSelect(
                      o.groupId
                        ? page.objects
                            .filter((n) => n.groupId === o.groupId && !n.locked)
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
                  };
                }}
                onDragMove={(e) => {
                  const n = e.target;
                  const targets = page.objects.filter(
                    (t) =>
                      t.id !== o.id && !selected.includes(t.id) && t.visible,
                  );
                  const snapX = [
                    page.width / 2,
                    ...targets.map((t) => t.x + t.width / 2),
                  ];
                  const snapY = [
                    page.height / 2,
                    ...targets.map((t) => t.y + t.height / 2),
                  ];
                  const g: { x?: number; y?: number } = {};
                  for (const x of snapX)
                    if (Math.abs(n.x() + o.width / 2 - x) < 14) {
                      n.x(x - o.width / 2);
                      g.x = x;
                      break;
                    }
                  for (const y of snapY)
                    if (Math.abs(n.y() + o.height / 2 - y) < 14) {
                      n.y(y - o.height / 2);
                      g.y = y;
                      break;
                    }
                  setGuides(g);
                  const d = dragStart.current;
                  if (d)
                    d.positions.forEach((p) => {
                      if (p.id !== o.id)
                        stageRef.current?.findOne("#o-" + p.id)?.position({
                          x: p.x + n.x() - d.x,
                          y: p.y + n.y() - d.y,
                        });
                    });
                }}
                onDragEnd={(e) => {
                  setGuides({});
                  const d = dragStart.current;
                  onChange(
                    page.objects.map((n) => {
                      const p = d?.positions.find((p) => p.id === n.id);
                      return p
                        ? {
                            ...n,
                            x: Math.round(p.x + e.target.x() - d!.x),
                            y: Math.round(p.y + e.target.y() - d!.y),
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
      </Layer>
      <Layer name="editor-overlay" listening={!preview} visible={!preview}>
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
            {Array.from({ length: Math.ceil(page.height / 100) }, (_, i) => (
              <Line
                key={"gy" + i}
                points={[0, i * 100, page.width, i * 100]}
                stroke="#596e8050"
                strokeWidth={1 / scale}
              />
            ))}
          </Group>
        )}
        {guides.x !== undefined && (
          <Line
            points={[guides.x, 0, guides.x, page.height]}
            stroke="#e77b53"
            strokeWidth={1 / scale}
            dash={[10, 10]}
          />
        )}
        {guides.y !== undefined && (
          <Line
            points={[0, guides.y, page.width, guides.y]}
            stroke="#e77b53"
            strokeWidth={1 / scale}
            dash={[10, 10]}
          />
        )}
        {box && (
          <Rect
            x={Math.min(box.x, box.x + box.w)}
            y={Math.min(box.y, box.y + box.h)}
            width={Math.abs(box.w)}
            height={Math.abs(box.h)}
            fill="#e87b5322"
            stroke="#e87b53"
            strokeWidth={1 / scale}
          />
        )}
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
          anchorSize={window.matchMedia("(pointer: coarse)").matches ? 14 : 8}
          anchorCornerRadius={2}
          anchorStyleFunc={(anchor) =>
            anchor.hitStrokeWidth(
              window.matchMedia("(pointer: coarse)").matches ? 26 : 8,
            )
          }
          borderStrokeWidth={1.5}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          flipEnabled={false}
          boundBoxFunc={(old, next) =>
            Math.abs(next.width) < 20 || Math.abs(next.height) < 20 ? old : next
          }
        />
      </Layer>
    </Stage>
  );
}
