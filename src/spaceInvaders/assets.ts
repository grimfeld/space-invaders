import { getStarColorFiles, type Params } from "./params";
import type { KaplayCtx } from "./types";

export async function loadSpaceInvadersAssets(
  k: KaplayCtx,
  p: Params
): Promise<void> {
  const loadSpriteSheet = (opts: {
    name: string;
    url: string;
    sliceX: number;
    sliceY: number;
    frames: number;
    animName: string;
    animSpeed: number;
    loop: boolean;
  }) => {
    return k.loadSprite(opts.name, opts.url, {
      sliceX: opts.sliceX,
      sliceY: opts.sliceY,
      anims: {
        [opts.animName]: {
          from: 0,
          to: opts.frames - 1,
          speed: opts.animSpeed,
          loop: opts.loop
        }
      }
    });
  };

  const showLoadError = (msg: string) => {
    k.add([
      k.text(msg, { size: 24 }),
      k.pos(k.width() / 2, k.height() / 2),
      k.anchor("center"),
      k.color(255, 0, 0),
      k.fixed(),
      "ui"
    ]);
  };

  try {
    const starColorFiles = getStarColorFiles(p);
    const playerSheets = p.player.spriteSheets as Record<string, any>;

    await Promise.all([
      k.loadSprite(p.background.staticBg.name, p.background.staticBg.url),
      ...(p.background.showEarth
        ? [k.loadSprite(p.background.earth.name, p.background.earth.url)]
        : []),
      k.loadSprite(p.background.moon.name, p.background.moon.url),
      k.loadSound(p.music.name, p.music.url),
      ...(p.victoryMusic?.enabled && p.victoryMusic.url
        ? [k.loadSound(p.victoryMusic.name, p.victoryMusic.url)]
        : []),
      k.loadSound(p.sounds.shipFire.name, p.sounds.shipFire.url),
      k.loadSound(p.sounds.shipDamage.name, p.sounds.shipDamage.url),
      k.loadSound(p.sounds.shipDeath.name, p.sounds.shipDeath.url),
      k.loadSound(p.sounds.enemyFire.name, p.sounds.enemyFire.url),
      k.loadSound(p.sounds.enemyDeath.name, p.sounds.enemyDeath.url),

      ...starColorFiles.map((file) => {
        const isTwinkling = file.startsWith(
          `${p.background.stars.twinkling.filePrefix}-`
        );
        const isPulsing = file.startsWith(
          `${p.background.stars.pulsing.filePrefix}-`
        );

        const kind = isTwinkling
          ? p.background.stars.twinkling
          : isPulsing
          ? p.background.stars.pulsing
          : p.background.stars.exploding;

        const spriteName = file.replace(/\.png$/, "");

        return k.loadSprite(spriteName, file, {
          sliceX: kind.frames,
          sliceY: 1,
          anims: {
            [kind.animName]: {
              from: 0,
              to: kind.frames - 1,
              speed: kind.speed,
              loop: true
            }
          }
        });
      }),

      k.loadSprite(
        p.background.stars.shooting.name,
        p.background.stars.shooting.url,
        {
          sliceX: p.background.stars.shooting.frames,
          sliceY: 1,
          anims: {
            [p.background.stars.shooting.animName]: {
              from: 0,
              to: p.background.stars.shooting.frames - 1,
              speed: p.background.stars.shooting.speed,
              loop: true
            }
          }
        }
      ),

      ...Object.entries(playerSheets).map(([state, cfg]) =>
        loadSpriteSheet({
          name: cfg.name,
          url: cfg.url,
          sliceX: cfg.sliceX,
          sliceY: cfg.sliceY,
          frames: cfg.frames,
          animName: state,
          animSpeed: cfg.animSpeed,
          loop: state === "idle" || state === "moving"
        })
      ),

      k.loadSprite(p.player.bulletSprite.name, p.player.bulletSprite.url),

      k.loadSprite(p.enemy.spriteSheet.name, p.enemy.spriteSheet.url, {
        sliceX: p.enemy.spriteSheet.sliceX,
        sliceY: p.enemy.spriteSheet.sliceY,
        anims: {
          [p.enemy.spriteSheet.defaultAnim]: {
            from: 0,
            to: p.enemy.spriteSheet.frames - 1,
            speed: p.enemy.spriteSheet.animSpeed,
            loop: true
          }
        }
      }),

      k.loadSprite(
        p.enemy.deathSpriteSheet.name,
        p.enemy.deathSpriteSheet.url,
        {
          sliceX: p.enemy.deathSpriteSheet.sliceX,
          sliceY: p.enemy.deathSpriteSheet.sliceY,
          anims: {
            [p.enemy.deathSpriteSheet.animName]: {
              from: 0,
              to: p.enemy.deathSpriteSheet.frames - 1,
              speed: p.enemy.deathSpriteSheet.animSpeed,
              loop: false
            }
          }
        }
      )
    ]);
  } catch (err) {
    console.error("Failed to load assets", err);
    showLoadError("Failed to load assets. Please refresh.");
    throw err;
  }
}
