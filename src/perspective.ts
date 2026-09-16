export type Point = { x: number; y: number };
/** Rotate around the device's Y axis, then project through a perspective camera. */
export function projectPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  degrees: number,
): Point {
  const angle = (degrees * Math.PI) / 180,
    distance = width * 3;
  const dx = x - width / 2,
    dy = y - height / 2;
  const z = -dx * Math.sin(angle);
  const scale = distance / (distance + z);
  return {
    x: width / 2 + dx * Math.cos(angle) * scale,
    y: height / 2 + dy * scale,
  };
}
function triangle(
  ctx: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  source: Point[],
  target: Point[],
) {
  const [a, b, c] = source,
    [p, q, r] = target;
  const det = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (!det) return;
  const m11 = ((q.x - p.x) * (c.y - a.y) - (r.x - p.x) * (b.y - a.y)) / det;
  const m12 = ((q.y - p.y) * (c.y - a.y) - (r.y - p.y) * (b.y - a.y)) / det;
  const m21 = ((r.x - p.x) * (b.x - a.x) - (q.x - p.x) * (c.x - a.x)) / det;
  const m22 = ((r.y - p.y) * (b.x - a.x) - (q.y - p.y) * (c.x - a.x)) / det;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.lineTo(r.x, r.y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(
    m11,
    m12,
    m21,
    m22,
    p.x - m11 * a.x - m21 * a.y,
    p.y - m12 * a.x - m22 * a.y,
  );
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}
/** Tessellate a snapshot into narrow strips. Cached once per device edit, not per drag. */
export function perspectiveCanvas(
  source: HTMLCanvasElement,
  width: number,
  height: number,
  padding: number,
  degrees: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const project = (p: Point) => {
    const point = projectPoint(
      p.x - padding,
      p.y - padding,
      width,
      height,
      degrees,
    );
    return { x: point.x + padding, y: point.y + padding };
  };
  const columns = 36;
  for (let i = 0; i < columns; i++) {
    // Slightly overlapping strips avoid hairline gaps between antialiased edges.
    const left = Math.max(0, (source.width * i) / columns - 0.35),
      right = Math.min(source.width, (source.width * (i + 1)) / columns + 0.35);
    const a = { x: left, y: 0 },
      b = { x: right, y: 0 },
      c = { x: right, y: source.height },
      d = { x: left, y: source.height };
    triangle(ctx, source, [a, b, c], [project(a), project(b), project(c)]);
    triangle(ctx, source, [a, c, d], [project(a), project(c), project(d)]);
  }
  return canvas;
}
