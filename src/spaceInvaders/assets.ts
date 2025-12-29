import { getStarColorFiles, type Params } from "./params";
import type { KaplayCtx } from "./types";

export async function loadSpaceInvadersAssets(
  k: KaplayCtx,
  p: Params
): Promise<void> {
  const showLoadError = (msg: string) => {
    k.add([
      k.text(msg, { size: 24 }),
      k.pos(k.width() / 2, k.height() / 2),
      k.anchor("center"),
      k.color(255, 0, 0),
      k.fixed(),
      "ui",
    ]);
  };

  try {
    const starColorFiles = getStarColorFiles(p);

    await Promise.all([
      k.loadSprite(p.background.staticBg.name, p.background.staticBg.url),
      ...(p.background.showEarth
        ? [k.loadSprite(p.background.earth.name, p.background.earth.url)]
        : []),
      k.loadSprite(p.background.moon.name, p.background.moon.url),
      k.loadSound(p.music.name, p.music.url),
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
              loop: true,
            },
          },
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
              loop: true,
            },
          },
        }
      ),

      k.loadSprite(p.player.spriteSheets.idle.name, p.player.spriteSheets.idle.url, {
        sliceX: p.player.spriteSheets.idle.sliceX,
        sliceY: p.player.spriteSheets.idle.sliceY,
        anims: {
          idle: {
            from: 0,
            to: p.player.spriteSheets.idle.frames - 1,
            speed: p.player.spriteSheets.idle.animSpeed,
            loop: true,
          },
        },
      }),

      k.loadSprite(
        p.player.spriteSheets.moving.name,
        p.player.spriteSheets.moving.url,
        {
          sliceX: p.player.spriteSheets.moving.sliceX,
          sliceY: p.player.spriteSheets.moving.sliceY,
          anims: {
            moving: {
              from: 0,
              to: p.player.spriteSheets.moving.frames - 1,
              speed: p.player.spriteSheets.moving.animSpeed,
              loop: true,
            },
          },
        }
      ),

      k.loadSprite(
        p.player.spriteSheets.damage.name,
        p.player.spriteSheets.damage.url,
        {
          sliceX: p.player.spriteSheets.damage.sliceX,
          sliceY: p.player.spriteSheets.damage.sliceY,
          anims: {
            damage: {
              from: 0,
              to: p.player.spriteSheets.damage.frames - 1,
              speed: p.player.spriteSheets.damage.animSpeed,
              loop: false,
            },
          },
        }
      ),

      k.loadSprite(p.player.spriteSheets.death.name, p.player.spriteSheets.death.url, {
        sliceX: p.player.spriteSheets.death.sliceX,
        sliceY: p.player.spriteSheets.death.sliceY,
        anims: {
          death: {
            from: 0,
            to: p.player.spriteSheets.death.frames - 1,
            speed: p.player.spriteSheets.death.animSpeed,
            loop: false,
          },
        },
      }),

      k.loadSprite(p.player.bulletSprite.name, p.player.bulletSprite.url),

      k.loadSprite(p.enemy.spriteSheet.name, p.enemy.spriteSheet.url, {
        sliceX: p.enemy.spriteSheet.sliceX,
        sliceY: p.enemy.spriteSheet.sliceY,
        anims: {
          [p.enemy.spriteSheet.defaultAnim]: {
            from: 0,
            to: p.enemy.spriteSheet.frames - 1,
            speed: p.enemy.spriteSheet.animSpeed,
            loop: true,
          },
        },
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
              loop: false,
            },
          },
        }
      ),
    ]);
  } catch (err) {
    console.error("Failed to load assets", err);
    showLoadError("Failed to load assets. Please refresh.");
    throw err;
  }
}


