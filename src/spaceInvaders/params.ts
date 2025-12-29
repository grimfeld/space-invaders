/**
 * Space Invaders tunables + asset names.
 *
 * Asset placement:
 * - Put ALL referenced PNGs directly in Vite `public/`:
 *   `/Users/paulperson/repos/games/KAPLAY/space-invaders/public/`
 *
 * Path rules:
 * - Use relative paths like "static-bg.png" (no leading "/")
 * - This matches `k.loadRoot("./")` and works with Vite `base: "./"` deployments.
 */

export type RGB = [number, number, number];
export type Range2 = [number, number];

export const starColors = ["blue", "green", "purple", "yellow"] as const;
export type StarColor = (typeof starColors)[number];

export const params = {
  // Debug-only toggles (used only when Vite dev mode is on).
  debug: {
    phaseSwitch: true,
  },
  canvas: {
    width: 375,
    height: 667,
    // Background clear color (#222034)
    background: [34, 32, 52] as RGB,
  },
  music: {
    name: "bgm-track-1",
    url: "musics/track-1.mp3",
    volume: 0.35,
  },
  // Sound effects (loaded from Vite public/ via k.loadRoot("./")).
  sounds: {
    shipFire: {
      name: "sfx-ship-fire",
      url: "sounds/ship-fire.wav",
      volume: 0.6,
    },
    shipDamage: {
      name: "sfx-ship-damage",
      url: "sounds/ship-damage.wav",
      volume: 0.7,
    },
    shipDeath: {
      name: "sfx-ship-death",
      url: "sounds/ship-death.wav",
      volume: 0.8,
    },
    enemyFire: {
      name: "sfx-enemy-fire",
      url: "sounds/enemy-fire.wav",
      volume: 0.55,
    },
    enemyDeath: {
      name: "sfx-enemy-death",
      url: "sounds/enemy-death.wav",
      volume: 0.65,
    },
  },
  background: {
    showEarth: false,
    // Parallax tuning (screen-space). Stars wrap; moon/earth just offset for depth.
    parallax: {
      staticBg: 0,
      moon: 0.25,
      // Vertical parallax factor for the moon (relative to ship spawn Y).
      moonY: 0.18,
      earth: 0.12,
      wrapMargin: 80,
      stars: {
        // Distant: should move very subtly compared to moon/earth.
        static: 0.02,
        animated: 0.025,
        exploding: 0.03,
        shooting: 0.03,
      },
    },
    staticBg: {
      name: "static-bg",
      url: "static-bg.png",
      width: 256,
      height: 640,
    },
    earth: {
      name: "earth",
      url: "earth.png",
      width: 256,
      height: 44,
    },
    moon: {
      name: "moon",
      url: "moon-tile.png",
      width: 64,
      height: 64,
    },
    stars: {
      colors: [...starColors] as StarColor[],
      twinkling: {
        filePrefix: "twinkling-star",
        frameSize: 9,
        frames: 24,
        animName: "twinkle",
        speed: 8,
        speedVariance: 0.35,
      },
      pulsing: {
        filePrefix: "pulsing-star",
        frameSize: 9,
        frames: 24,
        animName: "pulse",
        speed: 6,
        speedVariance: 0.3,
      },
      exploding: {
        filePrefix: "exploding-star",
        frameSize: 15,
        frames: 24,
        animName: "explode",
        speed: 18,
        speedVariance: 0.25,
      },
      shooting: {
        name: "shooting-star",
        url: "Shooting-star.png",
        frameWidth: 36,
        frameHeight: 33,
        frames: 8,
        animName: "shoot",
        speed: 14,
      },
      // Tunables
      twinklingStarCount: 6,
      pulsingStarCount: 6,
      staticStarCount: 90,
      starScale: 2,
      gridCellSizePx: 64,
      staticStarSizeRange: [1, 2] as Range2,
      animatedStarStartDelayRange: [0, 2.25] as Range2,
      shootingStarIntervalRange: [1.2, 3.2] as Range2,
      explodingStarIntervalRange: [0.9, 2.0] as Range2,
    },
  },
  player: {
    width: 40,
    height: 40,
    speed: 300,
    // Pointer-follow movement tuning (bottom zone only).
    movement: {
      zoneHeightFrac: 0.1,
      bottomPadPx: 6,
    },
    // Auto-fire tuning.
    autoFireShotsPerSecond: 2,
    bulletSpeed: 500,
    bulletSprite: {
      name: "playerBullet",
      url: "player-bullet.png",
      scale: 1,
    },
    lives: 5,
    spawnOffset: 40,
    hitRecoveryDelay: 0.5,
    spriteSheets: {
      idle: {
        name: "playerIdle",
        url: "ship-idle.png",
        sliceX: 4,
        sliceY: 1,
        frames: 4,
        frameWidth: 40,
        frameHeight: 40,
        animSpeed: 8,
      },
      moving: {
        name: "playerMoving",
        url: "ship-moving.png",
        sliceX: 4,
        sliceY: 1,
        frames: 4,
        frameWidth: 40,
        frameHeight: 40,
        animSpeed: 8,
      },
      // Plays when the ship takes a hit (non-lethal).
      damage: {
        name: "playerDamage",
        url: "ship-damage.png",
        sliceX: 4,
        sliceY: 1,
        frames: 4,
        frameWidth: 40,
        frameHeight: 40,
        animSpeed: 12,
      },
      // Plays when the ship is destroyed (lethal).
      death: {
        name: "playerDeath",
        url: "ship-death.png",
        sliceX: 4,
        sliceY: 1,
        frames: 4,
        frameWidth: 40,
        frameHeight: 40,
        animSpeed: 12,
      },
    },
  },
  enemy: {
    rows: 4,
    cols: 8,
    spacing: 40,
    startY: 60,
    introSlideSpeed: 260,
    size: 24,
    dropDistance: 15,
    horizontalPadding: 20,
    speed: 50,
    spriteSheet: {
      name: "alienFleet",
      url: "alien-1-idle.png",
      sliceX: 24,
      sliceY: 1,
      defaultAnim: "march",
      frames: 24,
      frameWidth: 32,
      frameHeight: 32,
      animSpeed: 12,
      animStartDelayRange: [0, 0.8] as Range2,
      animSpeedVariance: 0.25,
    },
    deathSpriteSheet: {
      name: "alienDeath",
      url: "alien-1-death.png",
      sliceX: 3,
      sliceY: 1,
      animName: "death",
      frames: 3,
      frameWidth: 32,
      frameHeight: 32,
      animSpeed: 14,
    },
  },
  enemyFire: {
    interval: 1.5,
    bulletSpeed: 250,
  },
  boss: {
    hp: 30,
    // Boss uses the normal enemy sprite sheet, just scaled up.
    scaleMultiplier: 4,
    // Intro cutscene
    introSlideSpeed: 220,
    // Sweep movement
    speed: 85,
    yFrac: 0.22,
    sweepPadding: 22,
    bobAmp: 6,
    bobSpeed: 2.1,
    // Shooting pattern (spread/fan)
    shootInterval: 1.5,
    bulletSpeed: 260,
    spreadCount: 3,
    spreadAngleDeg: 55,
  },
};

export type Params = typeof params;

export function getStarSpriteName(prefix: string, color: StarColor): string {
  return `${prefix}-${color}`;
}

export function getStarColorFiles(p: Params): string[] {
  return p.background.stars.colors.flatMap((color) => [
    `${p.background.stars.twinkling.filePrefix}-${color}.png`,
    `${p.background.stars.pulsing.filePrefix}-${color}.png`,
    `${p.background.stars.exploding.filePrefix}-${color}.png`,
  ]);
}


