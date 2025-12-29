import { getStarSpriteName, type Params, type StarColor } from "./params";
import type { KaplayCtx } from "./types";

export type BackgroundSetupResult = {
  earthScale: number;
  earthHeightScaled: number;
  wrapMargin: number;
};

export function setupBackground(
  k: KaplayCtx,
  p: Params,
  opts: { isGameOver: () => boolean }
): BackgroundSetupResult {
  // ------------------------------
  // Parallax helpers (screen-space, works with fixed() background)
  // ------------------------------
  const parallaxCfg: any = p.background?.parallax ?? {};
  const wrapMargin = parallaxCfg.wrapMargin ?? 80;

  const tagParallax = (obj: any, tagOpts: any = {}) => {
    const {
      parallax = 0,
      parallaxY = null,
      drift = null,
      wrap = null
    } = tagOpts as any;
    obj.use("bgParallax");
    obj.basePos = obj.pos.clone();
    obj.parallax = parallax;
    if (parallaxY !== null && parallaxY !== undefined)
      obj.parallaxY = parallaxY;
    if (drift) obj.drift = drift;
    if (wrap) obj.wrap = wrap;
    return obj;
  };

  // ------------------------------
  // Background layer
  // ------------------------------
  const bgScale = Math.max(
    k.width() / p.background.staticBg.width,
    k.height() / p.background.staticBg.height
  );

  const earthScale = p.background.showEarth
    ? k.width() / p.background.earth.width
    : 1;
  const earthHeightScaled = p.background.showEarth
    ? p.background.earth.height * earthScale
    : 0;

  // Static background
  const staticBg = k.add([
    k.sprite(p.background.staticBg.name),
    k.pos(k.width() / 2, k.height() / 2),
    k.anchor("center"),
    k.scale(bgScale),
    k.fixed(),
    k.z(-1000),
    "bg"
  ]);
  tagParallax(staticBg, {
    parallax: parallaxCfg.staticBg ?? 0,
    parallaxY: 0
  });

  // Star placement grid (64x64) to avoid clustering
  const starMaxY = Math.max(0, k.height() - earthHeightScaled);
  const grid = {
    cell: p.background.stars.gridCellSizePx,
    pad: 8
  };

  const buildGridPositions = () => {
    const out: { x: number; y: number }[] = [];
    const cell = grid.cell;

    const cols = Math.max(1, Math.floor((k.width() - 1) / cell) + 1);
    const rows = Math.max(1, Math.floor((starMaxY - 1) / cell) + 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cell + cell / 2;
        const y = row * cell + cell / 2;

        // Skip positions that would land below the star zone.
        if (y > starMaxY - grid.pad) continue;

        out.push({
          x: k.clamp(x, grid.pad, k.width() - grid.pad),
          y: k.clamp(y, grid.pad, starMaxY - grid.pad)
        });
      }
    }
    return out;
  };

  const shuffleInPlace = <T>(arr: T[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(k.rand(0, i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  };

  const allGridPositions = buildGridPositions();
  const gridPool = shuffleInPlace([...allGridPositions]);

  const jitterGridPos = (pos: { x: number; y: number }) => {
    const half = grid.cell / 2;
    const maxJitter = Math.max(0, half - grid.pad);
    const jx = k.rand(-maxJitter, maxJitter);
    const jy = k.rand(-maxJitter, maxJitter);
    return {
      x: k.clamp(pos.x + jx, grid.pad, k.width() - grid.pad),
      y: k.clamp(pos.y + jy, grid.pad, starMaxY - grid.pad)
    };
  };

  const takeGridPos = () => {
    const pos = gridPool.pop();
    if (pos) return jitterGridPos(pos);
    // Fallback (should be rare unless counts exceed grid cells)
    return {
      x: k.rand(grid.pad, k.width() - grid.pad),
      y: k.rand(grid.pad, Math.max(grid.pad, starMaxY - grid.pad))
    };
  };

  const pickGridPos = () => {
    if (allGridPositions.length === 0) return takeGridPos();
    return jitterGridPos(
      allGridPositions[Math.floor(k.rand(0, allGridPositions.length))]
    );
  };

  // Random static stars (cheap fill) - placed on grid to avoid clustering
  const staticColors: Record<StarColor, [number, number, number]> = {
    blue: [90, 175, 255],
    green: [130, 255, 190],
    purple: [205, 140, 255],
    yellow: [255, 235, 150]
  };

  // Reserve grid cells for animated stars so static stars don't consume them all.
  const reservedForAnimated =
    p.background.stars.twinklingStarCount + p.background.stars.pulsingStarCount;
  const availableForStatic = Math.max(0, gridPool.length - reservedForAnimated);
  const staticCount = Math.min(
    p.background.stars.staticStarCount,
    availableForStatic
  );

  for (let i = 0; i < staticCount; i++) {
    const color =
      p.background.stars.colors[
        Math.floor(k.rand(0, p.background.stars.colors.length))
      ];
    const [r, g, b] = staticColors[color];
    const size = k.rand(
      p.background.stars.staticStarSizeRange[0],
      p.background.stars.staticStarSizeRange[1]
    );
    const pos = takeGridPos();

    const s = k.add([
      k.rect(size, size),
      k.pos(pos.x, pos.y),
      k.anchor("center"),
      k.color(r, g, b),
      k.opacity(k.rand(0.5, 0.95)),
      k.fixed(),
      k.z(-950),
      "bg",
      "bgStarStatic"
    ]);
    // Parallax + wrap for stars
    tagParallax(s, {
      parallax: parallaxCfg.stars?.static ?? 0.06,
      wrap: { margin: wrapMargin, pad: grid.pad, maxY: starMaxY }
    });
    s.use("bgParallaxStar");
  }

  const spawnAnimatedStar = (
    kind: any,
    color: StarColor,
    pos: { x: number; y: number }
  ) => {
    const star = k.add([
      k.sprite(getStarSpriteName(kind.filePrefix, color)),
      k.pos(pos.x, pos.y),
      k.anchor("center"),
      k.scale(p.background.stars.starScale),
      k.opacity(k.rand(0.65, 1)),
      k.fixed(),
      k.z(-900),
      "bg",
      "bgStarAnimated"
    ]);
    tagParallax(star, {
      parallax: parallaxCfg.stars?.animated ?? 0.08,
      wrap: { margin: wrapMargin, pad: grid.pad, maxY: starMaxY }
    });
    star.use("bgParallaxStar");

    const [delayMin, delayMax] = p.background.stars.animatedStarStartDelayRange;
    const delay = k.rand(delayMin, delayMax);
    const variance = kind.speedVariance ?? 0;
    const speedFactor = 1 + k.rand(-variance, variance);

    // Force frame de-sync even if delay happens to match.
    star.frame = Math.floor(k.rand(0, kind.frames));

    k.wait(delay, () => {
      if (!star.exists()) return;
      star.play(kind.animName, { loop: true, speed: kind.speed * speedFactor });
    });
  };

  // Ensure all 4 colors appear even with low counts by round-robin selection.
  const colors = p.background.stars.colors;
  for (let i = 0; i < p.background.stars.twinklingStarCount; i++) {
    const color = colors[i % colors.length];
    spawnAnimatedStar(p.background.stars.twinkling, color, takeGridPos());
  }

  for (let i = 0; i < p.background.stars.pulsingStarCount; i++) {
    const color = colors[(i + 1) % colors.length];
    spawnAnimatedStar(p.background.stars.pulsing, color, takeGridPos());
  }

  const spawnExplodingStar = () => {
    const pos = pickGridPos();
    const color =
      p.background.stars.colors[
        Math.floor(k.rand(0, p.background.stars.colors.length))
      ];

    const star = k.add([
      k.sprite(
        getStarSpriteName(p.background.stars.exploding.filePrefix, color)
      ),
      k.pos(pos.x, pos.y),
      k.anchor("center"),
      k.scale(p.background.stars.starScale),
      k.opacity(k.rand(0.85, 1)),
      k.fixed(),
      k.z(-880),
      "bg",
      "bgStarExploding"
    ]);
    tagParallax(star, {
      parallax: parallaxCfg.stars?.exploding ?? 0.09,
      wrap: { margin: wrapMargin, pad: grid.pad, maxY: starMaxY }
    });
    star.use("bgParallaxStar");

    star.play(p.background.stars.exploding.animName, {
      loop: false,
      speed:
        p.background.stars.exploding.speed *
        (1 +
          k.rand(
            -p.background.stars.exploding.speedVariance,
            p.background.stars.exploding.speedVariance
          ))
    });

    const durationSec =
      p.background.stars.exploding.frames /
      Math.max(1, p.background.stars.exploding.speed);
    k.wait(durationSec + 0.05, () => {
      if (star.exists()) k.destroy(star);
    });
  };

  const scheduleExplodingStar = () => {
    const [min, max] = p.background.stars.explodingStarIntervalRange;
    const next = k.rand(min, max);
    k.wait(next, () => {
      if (opts.isGameOver()) return;
      spawnExplodingStar();
      scheduleExplodingStar();
    });
  };
  scheduleExplodingStar();

  // Spawn one immediately so the background doesn't feel static.
  if (!opts.isGameOver()) spawnExplodingStar();

  const spawnShootingStar = () => {
    const fromLeft = k.rand(0, 1) < 0.5;
    const startX = fromLeft ? -40 : k.width() + 40;
    const endX = fromLeft ? k.width() + 40 : -40;
    const startY = k.rand(0.08 * k.height(), 0.55 * starMaxY);
    const endY = startY + k.rand(40, 120);

    const star = k.add([
      k.sprite(p.background.stars.shooting.name, {
        anim: p.background.stars.shooting.animName
      }),
      k.pos(startX, startY),
      k.anchor("center"),
      k.scale(p.background.stars.starScale),
      k.opacity(0.95),
      k.fixed(),
      k.z(-870),
      "bg",
      "bgShootingStar"
    ]);
    tagParallax(star, {
      parallax: parallaxCfg.stars?.shooting ?? 0.1
    });
    star.use("bgParallaxStar");

    // Move over a fixed time.
    const travelTime = k.rand(0.65, 1.1);
    let t = 0;
    star.onUpdate(() => {
      if (opts.isGameOver()) {
        if (star.exists()) k.destroy(star);
        return;
      }
      t += k.dt();
      const u = Math.min(1, t / travelTime);
      star.pos.x = startX + (endX - startX) * u;
      star.pos.y = startY + (endY - startY) * u;
      if (u >= 1 && star.exists()) k.destroy(star);
    });
  };

  const scheduleShootingStar = () => {
    const [min, max] = p.background.stars.shootingStarIntervalRange;
    const next = k.rand(min, max);
    k.wait(next, () => {
      if (opts.isGameOver()) return;
      spawnShootingStar();
      scheduleShootingStar();
    });
  };
  scheduleShootingStar();

  //TODO: Make the assets programmable from the params. For example, the moon and earth.

  // Moon (left side)
  const moonScale = 2 * (k.width() / 375);
  const moon = k.add([
    k.sprite(p.background.moon.name),
    k.pos(55, 125),
    k.anchor("center"),
    k.scale(moonScale),
    k.fixed(),
    k.z(-860),
    "bg",
    "moon"
  ]);
  tagParallax(moon, {
    parallax: parallaxCfg.moon ?? 0.25,
    parallaxY: parallaxCfg.moonY ?? parallaxCfg.moon ?? 0.25
  });

  // Earth (fixed at bottom) - optional
  if (p.background.showEarth) {
    const earth = k.add([
      k.sprite(p.background.earth.name),
      k.pos(k.width() / 2, k.height()),
      k.anchor("bot"),
      k.scale(earthScale),
      k.fixed(),
      k.z(-850),
      "bg",
      "earth"
    ]);
    tagParallax(earth, { parallax: parallaxCfg.earth ?? 0.12, parallaxY: 0 });
  }

  return { earthScale, earthHeightScaled, wrapMargin };
}
