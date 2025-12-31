import type { KaplayCtx } from "./types";

export type RGB = [number, number, number];

export type HealthBar = {
  bg: any;
  fill: any;
  setRatio: (ratio: number) => void;
  setHidden: (hidden: boolean) => void;
  setCenterPos: (x: number, y: number) => void;
  destroy: () => void;
};

export function createHealthBar(
  k: KaplayCtx,
  opts: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    bgColor: RGB;
    fillColor: RGB;
    zBg: number;
    zFill: number;
    fixed?: boolean;
    tags?: string[];
  }
): HealthBar {
  const tags = opts.tags ?? [];
  const fixed = !!opts.fixed;

  const bg = k.add([
    k.rect(opts.width, opts.height),
    k.pos(opts.centerX, opts.centerY),
    k.anchor("center"),
    k.color(...opts.bgColor),
    k.z(opts.zBg),
    ...(fixed ? [k.fixed()] : []),
    ...tags,
  ]);

  // Fill anchors on the left so scaling X grows/shrinks correctly.
  const fill = k.add([
    k.rect(opts.width, opts.height),
    k.pos(opts.centerX - opts.width / 2, opts.centerY),
    k.anchor("left"),
    k.color(...opts.fillColor),
    k.scale(1, 1),
    k.z(opts.zFill),
    ...(fixed ? [k.fixed()] : []),
    ...tags,
  ]);

  const setRatio = (ratio: number) => {
    const r = k.clamp(ratio, 0, 1);
    if (fill?.scale) fill.scale.x = r;
  };

  const setHidden = (hidden: boolean) => {
    bg.hidden = hidden;
    fill.hidden = hidden;
  };

  const setCenterPos = (x: number, y: number) => {
    bg.pos.x = x;
    bg.pos.y = y;
    fill.pos.x = x - opts.width / 2;
    fill.pos.y = y;
  };

  const destroy = () => {
    if (bg?.exists && bg.exists()) k.destroy(bg);
    if (fill?.exists && fill.exists()) k.destroy(fill);
  };

  return { bg, fill, setRatio, setHidden, setCenterPos, destroy };
}

export function addCenteredText(
  k: KaplayCtx,
  opts: {
    label: string;
    color: RGB;
    x: number;
    y: number;
    size?: number;
    fixed?: boolean;
    z?: number;
    tags?: string[];
  }
): any {
  const tags = opts.tags ?? ["ui"];
  const fixed = !!opts.fixed;
  const size = opts.size ?? 48;

  return k.add([
    k.text(opts.label, { size }),
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.color(...opts.color),
    ...(fixed ? [k.fixed()] : []),
    ...(typeof opts.z === "number" ? [k.z(opts.z)] : []),
    ...tags,
  ]);
}

export function addRestartHint(
  k: KaplayCtx,
  opts: { x: number; y: number; fixed?: boolean; z?: number; tags?: string[] }
): any {
  const tags = opts.tags ?? ["ui"];
  const fixed = !!opts.fixed;

  return k.add([
    k.text("Press R to restart", { size: 18 }),
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.color(255, 255, 255),
    ...(fixed ? [k.fixed()] : []),
    ...(typeof opts.z === "number" ? [k.z(opts.z)] : []),
    ...tags,
  ]);
}


