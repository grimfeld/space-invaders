import { getStarColorFiles, getStarSpriteName } from "./params.js";

export async function loadSpaceInvadersAssets(k, p) {
  const showLoadError = (msg) => {
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

    await Promise.all([
      k.loadSprite(p.background.staticBg.name, p.background.staticBg.url),
      k.loadSprite(p.background.earth.name, p.background.earth.url),
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

      k.loadSprite(
        p.player.spriteSheets.idle.name,
        p.player.spriteSheets.idle.url,
        {
          sliceX: p.player.spriteSheets.idle.sliceX,
          sliceY: p.player.spriteSheets.idle.sliceY,
          anims: {
            idle: {
              from: 0,
              to: p.player.spriteSheets.idle.frames - 1,
              speed: p.player.spriteSheets.idle.animSpeed,
              loop: true
            }
          }
        }
      ),

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
              loop: true
            }
          }
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
              loop: false
            }
          }
        }
      ),

      k.loadSprite(
        p.player.spriteSheets.death.name,
        p.player.spriteSheets.death.url,
        {
          sliceX: p.player.spriteSheets.death.sliceX,
          sliceY: p.player.spriteSheets.death.sliceY,
          anims: {
            death: {
              from: 0,
              to: p.player.spriteSheets.death.frames - 1,
              speed: p.player.spriteSheets.death.animSpeed,
              loop: false
            }
          }
        }
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

export function registerSpaceInvadersScene(k, p) {
  k.scene("space-invaders", () => {
    let enemyDirection = 1;
    let pendingDrop = false;
    let gameOver = false;
    let lives = p.player.lives;
    let spriteLocked = false;
    let gameOverUiShown = false;
    let musicHandle = null;
    let musicStarted = false;

    const startMusic = () => {
      if (musicStarted) return;
      if (!p.music?.name) return;
      musicStarted = true;
      if (musicHandle?.stop) musicHandle.stop();
      musicHandle = k.play(p.music.name, {
        loop: true,
        volume: p.music.volume ?? 0.35
      });
    };

    const stopMusic = () => {
      if (musicHandle?.stop) musicHandle.stop();
      musicHandle = null;
    };

    // ------------------------------
    // Parallax helpers (screen-space, works with fixed() background)
    // ------------------------------
    const parallaxCfg = p.background?.parallax ?? {};
    const wrapMargin = parallaxCfg.wrapMargin ?? 80;
    const tagParallax = (obj, opts = {}) => {
      const {
        parallax = 0,
        parallaxY = null,
        drift = null,
        wrap = null
      } = opts;
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

    const earthScale = k.width() / p.background.earth.width;
    const earthHeightScaled = p.background.earth.height * earthScale;

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
      const out = [];
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

    const shuffleInPlace = (arr) => {
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

    const jitterGridPos = (pos) => {
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
    const staticColors = {
      blue: [90, 175, 255],
      green: [130, 255, 190],
      purple: [205, 140, 255],
      yellow: [255, 235, 150]
    };

    // Reserve grid cells for animated stars so static stars don't consume them all.
    const reservedForAnimated =
      p.background.stars.twinklingStarCount +
      p.background.stars.pulsingStarCount;
    const availableForStatic = Math.max(
      0,
      gridPool.length - reservedForAnimated
    );
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

    const spawnAnimatedStar = (kind, color, pos) => {
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

      const [delayMin, delayMax] =
        p.background.stars.animatedStarStartDelayRange;
      const delay = k.rand(delayMin, delayMax);
      const variance = kind.speedVariance ?? 0;
      const speedFactor = 1 + k.rand(-variance, variance);

      // Force frame de-sync even if delay happens to match.
      star.frame = Math.floor(k.rand(0, kind.frames));

      k.wait(delay, () => {
        if (!star.exists()) return;
        star.play(kind.animName, {
          loop: true,
          speed: kind.speed * speedFactor
        });
      });
    };

    // Ensure all 4 colors appear even with low counts by round-robin selection.
    const colors = p.background.stars.colors;
    for (let i = 0; i < p.background.stars.twinklingStarCount; i++) {
      const color = colors[i % colors.length];
      spawnAnimatedStar(p.background.stars.twinkling, color, takeGridPos());
    }
    for (let i = 0; i < p.background.stars.pulsingStarCount; i++) {
      const color = colors[(i + 2) % colors.length];
      spawnAnimatedStar(p.background.stars.pulsing, color, takeGridPos());
    }

    const spawnExplodingStar = () => {
      const color =
        p.background.stars.colors[
          Math.floor(k.rand(0, p.background.stars.colors.length))
        ];
      const kind = p.background.stars.exploding;
      const variance = kind.speedVariance ?? 0;
      const speedFactor = 1 + k.rand(-variance, variance);
      const speed = kind.speed * speedFactor;
      const pos = pickGridPos();

      const star = k.add([
        k.sprite(getStarSpriteName(kind.filePrefix, color)),
        k.pos(pos.x, pos.y),
        k.anchor("center"),
        k.scale(p.background.stars.starScale),
        k.opacity(k.rand(0.75, 1)),
        k.fixed(),
        k.z(-880),
        "bg",
        "bgStarExplode"
      ]);
      tagParallax(star, {
        parallax: parallaxCfg.stars?.exploding ?? 0.09,
        wrap: { margin: wrapMargin, pad: grid.pad, maxY: starMaxY }
      });
      star.use("bgParallaxStar");

      // Start from frame 0 so the full explosion is visible.
      star.frame = 0;
      star.play(kind.animName, { loop: false, speed });

      // If Kaplay doesn't expose an anim-end event, time it out safely.
      const durationSec = kind.frames / Math.max(1, speed);
      k.wait(durationSec + 0.05, () => {
        if (star.exists()) k.destroy(star);
      });
    };

    const scheduleExplodingStar = () => {
      const [min, max] = p.background.stars.explodingStarIntervalRange;
      const delay = k.rand(min, max);
      k.wait(delay, () => {
        if (gameOver) return;
        spawnExplodingStar();
        scheduleExplodingStar();
      });
    };
    k.wait(0.35, () => {
      if (!gameOver) spawnExplodingStar();
    });
    scheduleExplodingStar();

    const spawnShootingStar = () => {
      const pos = pickGridPos();

      const star = k.add([
        k.sprite(p.background.stars.shooting.name, {
          anim: p.background.stars.shooting.animName
        }),
        k.pos(pos.x, pos.y),
        k.anchor("center"),
        k.scale(p.background.stars.starScale),
        k.opacity(k.rand(0.8, 1)),
        k.fixed(),
        k.z(-870),
        "bg",
        "bgShootingStar"
      ]);
      tagParallax(star, {
        parallax: parallaxCfg.stars?.shooting ?? 0.1,
        wrap: { margin: wrapMargin, pad: grid.pad, maxY: starMaxY }
      });
      star.use("bgParallaxStar");

      star.play(p.background.stars.shooting.animName, {
        loop: false,
        speed: p.background.stars.shooting.speed
      });

      const durationSec =
        p.background.stars.shooting.frames /
        Math.max(1, p.background.stars.shooting.speed);
      k.wait(durationSec + 0.05, () => {
        if (star.exists()) k.destroy(star);
      });
    };

    const scheduleShootingStar = () => {
      const [min, max] = p.background.stars.shootingStarIntervalRange;
      const delay = k.rand(min, max);
      k.wait(delay, () => {
        if (gameOver) return;
        spawnShootingStar();
        scheduleShootingStar();
      });
    };
    scheduleShootingStar();

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

    // Earth (fixed at bottom)
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

    // ------------------------------
    // Player + UI
    // ------------------------------
    const baseSpriteWidth = p.player.spriteSheets.idle.frameWidth;
    const baseSpriteHeight = p.player.spriteSheets.idle.frameHeight;
    const playerSpriteScale = baseSpriteWidth
      ? p.player.width / baseSpriteWidth
      : 1;
    const scaledWidth = baseSpriteWidth * playerSpriteScale;
    const scaledHeight = baseSpriteHeight * playerSpriteScale;
    const playerHalfWidth = scaledWidth / 2;
    const playerHalfHeight = scaledHeight / 2;

    const enemySpriteScale = p.enemy.size / p.enemy.spriteSheet.frameWidth;

    const playerSpawnPos = k.vec2(
      k.width() / 2,
      k.height() - (p.player.spawnOffset + playerHalfHeight)
    );

    const player = k.add([
      k.sprite(p.player.spriteSheets.idle.name, { anim: "idle" }),
      k.pos(playerSpawnPos.x, playerSpawnPos.y),
      k.anchor("center"),
      k.scale(playerSpriteScale),
      k.area(),
      "player"
    ]);

    let currentPlayerState = "idle";
    let playerTarget = player.pos.clone();

    // Pointer-follow movement bounds (bottom portion of the playfield).
    const movementCfg = p.player?.movement ?? {};
    const zoneFrac = movementCfg.zoneHeightFrac ?? 0.1; // bottom 10%
    const bottomPadPx = movementCfg.bottomPadPx ?? 6;

    const moveMinX = playerHalfWidth;
    const moveMaxX = k.width() - playerHalfWidth;

    // Keep the ship above the earth sprite area.
    const moveMaxY =
      k.height() - earthHeightScaled - playerHalfHeight - bottomPadPx;
    const moveMinY = Math.max(
      playerHalfHeight,
      moveMaxY - k.height() * zoneFrac
    );

    const setPlayerTargetFromPointer = (pos) => {
      playerTarget.x = k.clamp(pos.x, moveMinX, moveMaxX);
      playerTarget.y = k.clamp(pos.y, moveMinY, moveMaxY);
    };

    // ------------------------------
    // Parallax updater (player offset + star drift + wrap)
    // ------------------------------
    k.onUpdate(() => {
      // Keep background stable once the round is over.
      if (gameOver) return;

      const dx = player.pos.x - k.width() / 2;
      const dy = player.pos.y - playerSpawnPos.y;

      // Apply player-based parallax only (stars are distant; no auto drift).
      for (const o of k.get("bgParallax")) {
        // Safety for objects that didn't get initialized.
        if (!o.basePos) o.basePos = o.pos.clone();
        const f = o.parallax ?? 0;
        const fy = o.parallaxY ?? f;

        // Re-wrap stars only (keeps moon/earth as single sprites).
        if (o.is("bgParallaxStar") && o.wrap) {
          const margin = o.wrap.margin ?? wrapMargin;
          const pad = o.wrap.pad ?? 8;
          const maxY = o.wrap.maxY ?? k.height();
          const wrapW = k.width() + 2 * margin;

          // Wrap based on the *final* parallaxed position so stars don't pop.
          const projectedX = o.basePos.x - dx * f;
          if (projectedX < -margin) o.basePos.x += wrapW;
          if (projectedX > k.width() + margin) o.basePos.x -= wrapW;

          const topY = pad;
          const botY = Math.max(pad, maxY - pad);
          if (o.basePos.y < topY) o.basePos.y = botY;
          if (o.basePos.y > botY) o.basePos.y = topY;
        }

        o.pos.x = o.basePos.x - dx * f;
        o.pos.y = o.basePos.y - dy * fy;
      }
    });

    const applySprite = (state) => {
      const spriteName = p.player.spriteSheets[state].name;
      const animName = state;
      player.use(k.sprite(spriteName, { anim: animName }));
      currentPlayerState = state;
    };

    const setPlayerState = (state, options = {}) => {
      const { force = false } = options;
      if (!force) {
        if (spriteLocked) return;
        if (currentPlayerState === state) return;
      }
      applySprite(state);
    };

    const updateSpriteFromMovement = (moving) => {
      if (spriteLocked || gameOver) return;
      setPlayerState(moving ? "moving" : "idle");
    };

    setPlayerState("idle", { force: true });

    const livesLabel = k.add([
      k.text(`Lives: ${lives}`, { size: 20 }),
      k.pos(15, 15),
      k.fixed(),
      k.color(255, 255, 255),
      "ui"
    ]);

    const updateLivesLabel = () => {
      livesLabel.text = `Lives: ${Math.max(lives, 0)}`;
    };

    const showCenteredText = (label, color) =>
      k.add([
        k.text(label, { size: 48 }),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor("center"),
        k.color(...color),
        "ui"
      ]);

    const triggerGameOver = (message = "GAME OVER") => {
      gameOver = true;
      spriteLocked = true;
      stopMusic();
      if (gameOverUiShown) return;
      gameOverUiShown = true;
      showCenteredText(message, [255, 0, 0]);
      k.add([
        k.text("Press R to restart", { size: 18 }),
        k.pos(k.width() / 2, k.height() / 2 + 48),
        k.anchor("center"),
        k.color(255, 255, 255),
        "ui"
      ]);
    };

    const triggerWin = () => {
      if (gameOver) return;
      gameOver = true;
      spriteLocked = true;
      stopMusic();
      setPlayerState("idle", { force: true });
      showCenteredText("YOU WIN!", [0, 255, 0]);
      k.add([
        k.text("Press R to restart", { size: 18 }),
        k.pos(k.width() / 2, k.height() / 2 + 48),
        k.anchor("center"),
        k.color(255, 255, 255),
        "ui"
      ]);
    };

    const resetPlayerPosition = () => {
      player.pos = k.vec2(playerSpawnPos.x, playerSpawnPos.y);
      playerTarget = player.pos.clone();
    };

    const handlePlayerHit = (forceGameOver = false) => {
      if (gameOver) return;

      spriteLocked = true;

      if (forceGameOver) {
        lives = 0;
      } else {
        lives -= 1;
      }

      updateLivesLabel();

      if (lives <= 0) {
        // Lethal: play death anim, then show game over UI.
        gameOver = true;
        spriteLocked = true;
        k.play(p.sounds.shipDeath.name, { volume: p.sounds.shipDeath.volume });
        setPlayerState("death", { force: true });

        const deathCfg = p.player.spriteSheets.death;
        const deathDurationSec =
          deathCfg.frames / Math.max(1, deathCfg.animSpeed);
        k.wait(deathDurationSec + 0.05, () => {
          triggerGameOver();
        });
        return;
      }

      resetPlayerPosition();
      k.play(p.sounds.shipDamage.name, { volume: p.sounds.shipDamage.volume });
      setPlayerState("damage", { force: true });

      const damageCfg = p.player.spriteSheets.damage;
      const damageDurationSec =
        damageCfg.frames / Math.max(1, damageCfg.animSpeed);
      const recoverySec = Math.max(
        p.player.hitRecoveryDelay,
        damageDurationSec
      );

      k.wait(recoverySec, () => {
        if (gameOver) return;
        spriteLocked = false;
        updateSpriteFromMovement(false);
      });
    };

    const shootBullet = () => {
      if (gameOver) return;
      k.play(p.sounds.shipFire.name, { volume: p.sounds.shipFire.volume });
      k.add([
        k.sprite(p.player.bulletSprite.name),
        k.scale(p.player.bulletSprite.scale),
        k.anchor("center"),
        k.pos(player.pos.x, player.pos.y - playerHalfHeight),
        k.area(),
        k.move(k.UP, p.player.bulletSpeed),
        k.offscreen({ destroy: true }),
        "bullet"
      ]);
    };

    // Auto-fire (parametric).
    const shotsPerSec = p.player.autoFireShotsPerSecond ?? 2;
    const autoFireIntervalSec = shotsPerSec > 0 ? 1 / shotsPerSec : null;
    if (autoFireIntervalSec) {
      k.loop(autoFireIntervalSec, () => {
        shootBullet();
      });
    }

    // Pointer controls: move ship toward pointer/finger at a fixed speed.
    k.onMouseMove(() => setPlayerTargetFromPointer(k.mousePos()));
    k.onMousePress(() => {
      startMusic();
      setPlayerTargetFromPointer(k.mousePos());
    });
    k.onTouchStart((pos) => {
      if (gameOver) return;
      startMusic();
      setPlayerTargetFromPointer(pos);
    });
    k.onTouchMove((pos) => {
      if (gameOver) return;
      setPlayerTargetFromPointer(pos);
    });

    k.onKeyPress("r", () => {
      if (!gameOver) return;
      stopMusic();
      k.go("space-invaders");
    });

    // ------------------------------
    // Enemies
    // ------------------------------
    for (let row = 0; row < p.enemy.rows; row++) {
      for (let col = 0; col < p.enemy.cols; col++) {
        const enemy = k.add([
          k.sprite(p.enemy.spriteSheet.name, {
            anim: p.enemy.spriteSheet.defaultAnim
          }),
          k.pos(
            col * p.enemy.spacing + 30,
            row * p.enemy.spacing + p.enemy.startY
          ),
          k.scale(enemySpriteScale),
          k.area(),
          "enemy"
        ]);

        const [delayMin, delayMax] = p.enemy.spriteSheet
          .animStartDelayRange ?? [0, 0];
        const delay = k.rand(delayMin, delayMax);
        const variance = p.enemy.spriteSheet.animSpeedVariance ?? 0;
        const speedFactor = 1 + k.rand(-variance, variance);

        k.wait(delay, () => {
          if (!enemy.exists()) return;
          enemy.play(p.enemy.spriteSheet.defaultAnim, {
            loop: true,
            speed: p.enemy.spriteSheet.animSpeed * speedFactor
          });
        });
      }
    }

    k.loop(p.enemyFire.interval, () => {
      if (gameOver) return;
      const enemies = k.get("enemy");
      if (enemies.length === 0) return;

      const shooter = enemies[Math.floor(k.rand(0, enemies.length))];
      if (!shooter) return;

      k.play(p.sounds.enemyFire.name, { volume: p.sounds.enemyFire.volume });
      k.add([
        k.rect(4, 12),
        k.pos(
          shooter.pos.x + p.enemy.size / 2 - 2,
          shooter.pos.y + p.enemy.size
        ),
        k.area(),
        k.color(255, 165, 0),
        k.move(k.DOWN, p.enemyFire.bulletSpeed),
        k.offscreen({ destroy: true }),
        "enemyBullet"
      ]);
    });

    k.onUpdate(() => {
      if (gameOver) return;

      // Slide toward pointer target at fixed speed (px/sec).
      const dt = k.dt();
      const speed = p.player.speed;
      const dx = playerTarget.x - player.pos.x;
      const dy = playerTarget.y - player.pos.y;
      const dist = Math.hypot(dx, dy);
      const step = speed * dt;
      const moving = dist > 0.5;

      if (moving) {
        if (dist <= step) {
          player.pos.x = playerTarget.x;
          player.pos.y = playerTarget.y;
        } else {
          player.pos.x += (dx / dist) * step;
          player.pos.y += (dy / dist) * step;
        }
      }

      // Clamp defensively.
      player.pos.x = k.clamp(player.pos.x, moveMinX, moveMaxX);
      player.pos.y = k.clamp(player.pos.y, moveMinY, moveMaxY);
      updateSpriteFromMovement(moving);

      const enemies = k.get("enemy");
      if (enemies.length === 0) return;

      if (pendingDrop) {
        enemies.forEach((enemy) => {
          enemy.pos.y += p.enemy.dropDistance;
        });
        pendingDrop = false;
      }

      enemies.forEach((enemy) => {
        enemy.move(p.enemy.speed * enemyDirection, 0);
      });

      let minX = Infinity;
      let maxX = -Infinity;

      enemies.forEach((enemy) => {
        if (enemy.pos.x < minX) minX = enemy.pos.x;
        const enemyRight = enemy.pos.x + p.enemy.size;
        if (enemyRight > maxX) maxX = enemyRight;

        const enemyBottom = enemy.pos.y + p.enemy.size;
        const playerTop = player.pos.y - playerHalfHeight;
        if (!gameOver && enemyBottom >= playerTop) {
          handlePlayerHit(true);
        }
      });

      const reachedLeftEdge =
        enemyDirection === -1 && minX <= p.enemy.horizontalPadding;
      const reachedRightEdge =
        enemyDirection === 1 && maxX >= k.width() - p.enemy.horizontalPadding;

      if (reachedLeftEdge || reachedRightEdge) {
        enemyDirection *= -1;
        pendingDrop = true;
      }
    });

    // ------------------------------
    // Collisions
    // ------------------------------
    k.onCollide("bullet", "enemy", (bullet, enemy) => {
      const deathPos = enemy?.pos ? k.vec2(enemy.pos.x, enemy.pos.y) : null;
      k.destroy(bullet);
      k.destroy(enemy);
      k.play(p.sounds.enemyDeath.name, { volume: p.sounds.enemyDeath.volume });

      if (deathPos) {
        const death = k.add([
          k.sprite(p.enemy.deathSpriteSheet.name, {
            anim: p.enemy.deathSpriteSheet.animName
          }),
          k.pos(deathPos.x, deathPos.y),
          k.scale(enemySpriteScale),
          "enemyDeath"
        ]);

        death.play(p.enemy.deathSpriteSheet.animName, {
          loop: false,
          speed: p.enemy.deathSpriteSheet.animSpeed
        });

        const durationSec =
          p.enemy.deathSpriteSheet.frames /
          Math.max(1, p.enemy.deathSpriteSheet.animSpeed);
        k.wait(durationSec + 0.05, () => {
          if (death.exists()) k.destroy(death);
        });
      }

      if (k.get("enemy").length === 0) {
        triggerWin();
      }
    });

    k.onCollide("enemy", "player", () => {
      handlePlayerHit();
    });

    k.onCollide("enemyBullet", "player", (enemyBullet) => {
      k.destroy(enemyBullet);
      handlePlayerHit();
    });

    k.onCollide("bullet", "enemyBullet", (playerBullet, enemyBullet) => {
      k.destroy(playerBullet);
      k.destroy(enemyBullet);
    });

    // Mouse restart fallback
    k.onClick(() => {
      if (!gameOver) return;
      stopMusic();
      k.go("space-invaders");
    });
  });
}
