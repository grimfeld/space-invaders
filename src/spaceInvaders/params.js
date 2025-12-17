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

export const starColors = /** @type {const} */ ([
  "blue",
  "green",
  "purple",
  "yellow"
]);

export const params = {
  canvas: {
    width: 375,
    height: 667,
    // Background clear color (#222034)
    background: /** @type {[number, number, number]} */ ([34, 32, 52])
  },
  music: {
    name: "bgm-track-1",
    url: "musics/track-1.mp3",
    volume: 0.35
  },
  // Sound effects (loaded from Vite public/ via k.loadRoot("./")).
  sounds: {
    shipFire: {
      name: "sfx-ship-fire",
      url: "sounds/ship-fire.wav",
      volume: 0.6
    },
    shipDamage: {
      name: "sfx-ship-damage",
      url: "sounds/ship-damage.wav",
      volume: 0.7
    },
    shipDeath: {
      name: "sfx-ship-death",
      url: "sounds/ship-death.wav",
      volume: 0.8
    },
    enemyFire: {
      name: "sfx-enemy-fire",
      url: "sounds/enemy-fire.wav",
      volume: 0.55
    },
    enemyDeath: {
      name: "sfx-enemy-death",
      url: "sounds/enemy-death.wav",
      volume: 0.65
    }
  },
  background: {
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
        shooting: 0.03
      }
    },
    staticBg: {
      name: "static-bg",
      url: "static-bg.png",
      width: 256,
      height: 640
    },
    earth: {
      name: "earth",
      url: "earth.png",
      width: 256,
      height: 44
    },
    moon: {
      name: "moon",
      url: "moon-tile.png",
      width: 64,
      height: 64
    },
    stars: {
      colors: starColors,
      twinkling: {
        filePrefix: "twinkling-star",
        frameSize: 9,
        frames: 24,
        animName: "twinkle",
        speed: 8,
        speedVariance: 0.35
      },
      pulsing: {
        filePrefix: "pulsing-star",
        frameSize: 9,
        frames: 24,
        animName: "pulse",
        speed: 6,
        speedVariance: 0.3
      },
      exploding: {
        filePrefix: "exploding-star",
        frameSize: 15,
        frames: 24,
        animName: "explode",
        speed: 18,
        speedVariance: 0.25
      },
      shooting: {
        name: "shooting-star",
        url: "Shooting-star.png",
        frameWidth: 36,
        frameHeight: 33,
        frames: 8,
        animName: "shoot",
        speed: 14
      },
      // Tunables
      twinklingStarCount: 6,
      pulsingStarCount: 6,
      staticStarCount: 90,
      starScale: 2,
      gridCellSizePx: 64,
      staticStarSizeRange: /** @type {[number, number]} */ ([1, 2]),
      animatedStarStartDelayRange: /** @type {[number, number]} */ ([0, 2.25]),
      shootingStarIntervalRange: /** @type {[number, number]} */ ([1.2, 3.2]),
      explodingStarIntervalRange: /** @type {[number, number]} */ ([0.9, 2.0])
    }
  },
  player: {
    width: 40,
    height: 40,
    speed: 300,
    // Pointer-follow movement tuning (bottom zone only).
    movement: {
      zoneHeightFrac: 0.1,
      bottomPadPx: 6
    },
    // Auto-fire tuning.
    autoFireShotsPerSecond: 2,
    bulletSpeed: 500,
    bulletSprite: {
      name: "playerBullet",
      url: "player-bullet.png",
      scale: 1
    },
    lives: 3,
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
        animSpeed: 8
      },
      moving: {
        name: "playerMoving",
        url: "ship-moving.png",
        sliceX: 4,
        sliceY: 1,
        frames: 4,
        frameWidth: 40,
        frameHeight: 40,
        animSpeed: 8
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
        animSpeed: 12
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
        animSpeed: 12
      }
    }
  },
  enemy: {
    rows: 4,
    cols: 8,
    spacing: 40,
    startY: 60,
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
      animStartDelayRange: /** @type {[number, number]} */ ([0, 0.8]),
      animSpeedVariance: 0.25
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
      animSpeed: 14
    }
  },
  enemyFire: {
    interval: 1.5,
    bulletSpeed: 250
  }
};

export function getStarSpriteName(prefix, color) {
  return `${prefix}-${color}`;
}

export function getStarColorFiles(p) {
  return p.background.stars.colors.flatMap((color) => [
    `${p.background.stars.twinkling.filePrefix}-${color}.png`,
    `${p.background.stars.pulsing.filePrefix}-${color}.png`,
    `${p.background.stars.exploding.filePrefix}-${color}.png`
  ]);
}
