import { getStarColorFiles, getStarSpriteName } from "./params.js";

export async function loadSpaceInvadersAssets(k, p) {
  const showLoadError = (msg) => {
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
      k.loadSprite(p.touchControls.sprites.left.name, p.touchControls.sprites.left.url),
      k.loadSprite(p.touchControls.sprites.right.name, p.touchControls.sprites.right.url),
      k.loadSprite(p.touchControls.sprites.fire.name, p.touchControls.sprites.fire.url),
      k.loadSprite(p.background.staticBg.name, p.background.staticBg.url),
      k.loadSprite(p.background.earth.name, p.background.earth.url),
      k.loadSprite(p.background.moon.name, p.background.moon.url),

      ...starColorFiles.map((file) => {
        const isTwinkling = file.startsWith(`${p.background.stars.twinkling.filePrefix}-`);
        const isPulsing = file.startsWith(`${p.background.stars.pulsing.filePrefix}-`);

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

      k.loadSprite(p.background.stars.shooting.name, p.background.stars.shooting.url, {
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
      }),

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

      k.loadSprite(p.player.spriteSheets.moving.name, p.player.spriteSheets.moving.url, {
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

      k.loadSprite(p.enemy.deathSpriteSheet.name, p.enemy.deathSpriteSheet.url, {
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
      }),
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

    // ------------------------------
    // Background layer
    // ------------------------------
    const bgScale = Math.max(
      k.width() / p.background.staticBg.width,
      k.height() / p.background.staticBg.height,
    );

    const earthScale = k.width() / p.background.earth.width;
    const earthHeightScaled = p.background.earth.height * earthScale;

    // Static background
    k.add([
      k.sprite(p.background.staticBg.name),
      k.pos(k.width() / 2, k.height() / 2),
      k.anchor("center"),
      k.scale(bgScale),
      k.fixed(),
      k.z(-1000),
      "bg",
    ]);

    // Star placement grid (64x64) to avoid clustering
    const starMaxY = Math.max(0, k.height() - earthHeightScaled);
    const grid = {
      cell: p.background.stars.gridCellSizePx,
      pad: 8,
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
            y: k.clamp(y, grid.pad, starMaxY - grid.pad),
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
        y: k.clamp(pos.y + jy, grid.pad, starMaxY - grid.pad),
      };
    };

    const takeGridPos = () => {
      const pos = gridPool.pop();
      if (pos) return jitterGridPos(pos);
      // Fallback (should be rare unless counts exceed grid cells)
      return {
        x: k.rand(grid.pad, k.width() - grid.pad),
        y: k.rand(grid.pad, Math.max(grid.pad, starMaxY - grid.pad)),
      };
    };

    const pickGridPos = () => {
      if (allGridPositions.length === 0) return takeGridPos();
      return jitterGridPos(allGridPositions[Math.floor(k.rand(0, allGridPositions.length))]);
    };

    // Random static stars (cheap fill) - placed on grid to avoid clustering
    const staticColors = {
      blue: [90, 175, 255],
      green: [130, 255, 190],
      purple: [205, 140, 255],
      yellow: [255, 235, 150],
    };

    // Reserve grid cells for animated stars so static stars don't consume them all.
    const reservedForAnimated = p.background.stars.twinklingStarCount + p.background.stars.pulsingStarCount;
    const availableForStatic = Math.max(0, gridPool.length - reservedForAnimated);
    const staticCount = Math.min(p.background.stars.staticStarCount, availableForStatic);

    for (let i = 0; i < staticCount; i++) {
      const color = p.background.stars.colors[Math.floor(k.rand(0, p.background.stars.colors.length))];
      const [r, g, b] = staticColors[color];
      const size = k.rand(p.background.stars.staticStarSizeRange[0], p.background.stars.staticStarSizeRange[1]);
      const pos = takeGridPos();

      k.add([
        k.rect(size, size),
        k.pos(pos.x, pos.y),
        k.anchor("center"),
        k.color(r, g, b),
        k.opacity(k.rand(0.5, 0.95)),
        k.fixed(),
        k.z(-950),
        "bg",
        "bgStarStatic",
      ]);
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
        "bgStarAnimated",
      ]);

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
      const color = colors[(i + 2) % colors.length];
      spawnAnimatedStar(p.background.stars.pulsing, color, takeGridPos());
    }

    const spawnExplodingStar = () => {
      const color = p.background.stars.colors[Math.floor(k.rand(0, p.background.stars.colors.length))];
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
        "bgStarExplode",
      ]);

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
        k.sprite(p.background.stars.shooting.name, { anim: p.background.stars.shooting.animName }),
        k.pos(pos.x, pos.y),
        k.anchor("center"),
        k.scale(p.background.stars.starScale),
        k.opacity(k.rand(0.8, 1)),
        k.fixed(),
        k.z(-870),
        "bg",
        "bgShootingStar",
      ]);

      star.play(p.background.stars.shooting.animName, {
        loop: false,
        speed: p.background.stars.shooting.speed,
      });

      const durationSec = p.background.stars.shooting.frames / Math.max(1, p.background.stars.shooting.speed);
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
    k.add([
      k.sprite(p.background.moon.name),
      k.pos(55, 125),
      k.anchor("center"),
      k.scale(moonScale),
      k.fixed(),
      k.z(-860),
      "bg",
      "moon",
    ]);

    // Earth (fixed at bottom)
    k.add([
      k.sprite(p.background.earth.name),
      k.pos(k.width() / 2, k.height()),
      k.anchor("bot"),
      k.scale(earthScale),
      k.fixed(),
      k.z(-850),
      "bg",
      "earth",
    ]);

    // ------------------------------
    // Player + UI
    // ------------------------------
    const baseSpriteWidth = p.player.spriteSheets.idle.frameWidth;
    const baseSpriteHeight = p.player.spriteSheets.idle.frameHeight;
    const playerSpriteScale = baseSpriteWidth ? p.player.width / baseSpriteWidth : 1;
    const scaledWidth = baseSpriteWidth * playerSpriteScale;
    const scaledHeight = baseSpriteHeight * playerSpriteScale;
    const playerHalfWidth = scaledWidth / 2;
    const playerHalfHeight = scaledHeight / 2;

    const enemySpriteScale = p.enemy.size / p.enemy.spriteSheet.frameWidth;

    const playerSpawnPos = k.vec2(
      k.width() / 2,
      k.height() - (p.player.spawnOffset + playerHalfHeight),
    );

    const player = k.add([
      k.sprite(p.player.spriteSheets.idle.name, { anim: "idle" }),
      k.pos(playerSpawnPos.x, playerSpawnPos.y),
      k.anchor("center"),
      k.scale(playerSpriteScale),
      k.area(),
      "player",
    ]);

    let currentPlayerState = "idle";

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

    const updateSpriteFromMovement = () => {
      if (spriteLocked || gameOver) return;
      const moving = k.isKeyDown("left") || k.isKeyDown("right");
      setPlayerState(moving ? "moving" : "idle");
    };

    setPlayerState("idle", { force: true });

    const livesLabel = k.add([
      k.text(`Lives: ${lives}`, { size: 20 }),
      k.pos(15, 15),
      k.fixed(),
      k.color(255, 255, 255),
      "ui",
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
        "ui",
      ]);

    const triggerGameOver = (message = "GAME OVER") => {
      if (gameOver) return;
      gameOver = true;
      spriteLocked = true;
      showCenteredText(message, [255, 0, 0]);
      k.add([
        k.text("Press R to restart", { size: 18 }),
        k.pos(k.width() / 2, k.height() / 2 + 48),
        k.anchor("center"),
        k.color(255, 255, 255),
        "ui",
      ]);
    };

    const triggerWin = () => {
      if (gameOver) return;
      gameOver = true;
      spriteLocked = true;
      setPlayerState("idle", { force: true });
      showCenteredText("YOU WIN!", [0, 255, 0]);
      k.add([
        k.text("Press R to restart", { size: 18 }),
        k.pos(k.width() / 2, k.height() / 2 + 48),
        k.anchor("center"),
        k.color(255, 255, 255),
        "ui",
      ]);
    };

    const resetPlayerPosition = () => {
      player.pos = k.vec2(playerSpawnPos.x, playerSpawnPos.y);
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
        triggerGameOver();
        return;
      }

      resetPlayerPosition();

      k.wait(p.player.hitRecoveryDelay, () => {
        if (gameOver) return;
        spriteLocked = false;
        updateSpriteFromMovement();
      });
    };

    const shootBullet = () => {
      if (gameOver) return;
      k.add([
        k.sprite(p.player.bulletSprite.name),
        k.scale(p.player.bulletSprite.scale),
        k.anchor("center"),
        k.pos(player.pos.x, player.pos.y - playerHalfHeight),
        k.area(),
        k.move(k.UP, p.player.bulletSpeed),
        k.offscreen({ destroy: true }),
        "bullet",
      ]);
    };

    // Keyboard controls
    k.onKeyDown("left", updateSpriteFromMovement);
    k.onKeyDown("right", updateSpriteFromMovement);
    k.onKeyRelease("left", updateSpriteFromMovement);
    k.onKeyRelease("right", updateSpriteFromMovement);
    k.onKeyPress("space", shootBullet);

    k.onKeyPress("r", () => {
      if (!gameOver) return;
      k.go("space-invaders");
    });

    // ------------------------------
    // Touch UI (behavior refined in a later todo)
    // ------------------------------
    const buttonY = k.height() - p.touchControls.buttonPadding - p.touchControls.buttonSize / 2;
    const leftButtonX = p.touchControls.buttonPadding + p.touchControls.buttonSize / 2;
    const rightButtonX = leftButtonX + p.touchControls.buttonSize + 20;
    const shootButtonX = k.width() - p.touchControls.buttonPadding - p.touchControls.shootButtonSize / 2;

    const leftButton = k.add([
      k.sprite(p.touchControls.sprites.left.name),
      k.pos(leftButtonX, buttonY),
      k.anchor("center"),
      k.scale(p.touchControls.buttonSize / 64),
      k.fixed(),
      k.area(),
      k.opacity(0.5),
      "touchButton",
      "leftButton",
    ]);

    const rightButton = k.add([
      k.sprite(p.touchControls.sprites.right.name),
      k.pos(rightButtonX, buttonY),
      k.anchor("center"),
      k.scale(p.touchControls.buttonSize / 64),
      k.fixed(),
      k.area(),
      k.opacity(0.5),
      "touchButton",
      "rightButton",
    ]);

    const shootButton = k.add([
      k.sprite(p.touchControls.sprites.fire.name),
      k.pos(shootButtonX, buttonY),
      k.anchor("center"),
      k.scale(p.touchControls.shootButtonSize / 64),
      k.fixed(),
      k.area(),
      k.opacity(0.5),
      "touchButton",
      "shootButton",
    ]);

    // Hold-to-move touch buttons
    const leftTouchIds = new Set();
    const rightTouchIds = new Set();
    let leftMouseHeld = false;
    let rightMouseHeld = false;

    const setButtonOpacity = () => {
      if (leftButton.exists()) leftButton.opacity = leftTouchIds.size > 0 || leftMouseHeld ? 0.8 : 0.5;
      if (rightButton.exists()) rightButton.opacity = rightTouchIds.size > 0 || rightMouseHeld ? 0.8 : 0.5;
    };

    const isHoldingLeft = () => leftTouchIds.size > 0 || leftMouseHeld;
    const isHoldingRight = () => rightTouchIds.size > 0 || rightMouseHeld;

    const updateHoldFromTouch = (pos, touchId) => {
      if (leftButton.exists() && leftButton.hasPoint(pos)) {
        leftTouchIds.add(touchId);
      } else {
        leftTouchIds.delete(touchId);
      }
      if (rightButton.exists() && rightButton.hasPoint(pos)) {
        rightTouchIds.add(touchId);
      } else {
        rightTouchIds.delete(touchId);
      }
      setButtonOpacity();
    };

    const flashShootButton = () => {
      if (!shootButton.exists()) return;
      shootButton.opacity = 0.8;
      k.wait(0.1, () => {
        if (shootButton.exists()) shootButton.opacity = 0.5;
      });
    };

    // Shoot on click / tap
    shootButton.onClick(() => {
      shootBullet();
      flashShootButton();
    });

    k.onTouchStart((pos, t) => {
      if (gameOver) return;
      if (shootButton.exists() && shootButton.hasPoint(pos)) {
        shootBullet();
        flashShootButton();
        return;
      }
      updateHoldFromTouch(pos, t.id);
      updateSpriteFromMovement();
    });

    k.onTouchMove((pos, t) => {
      if (gameOver) return;
      updateHoldFromTouch(pos, t.id);
      updateSpriteFromMovement();
    });

    k.onTouchEnd((_pos, t) => {
      leftTouchIds.delete(t.id);
      rightTouchIds.delete(t.id);
      setButtonOpacity();
      updateSpriteFromMovement();
    });

    // Mouse fallback for holding buttons on desktop
    k.onMousePress(() => {
      if (gameOver) return;
      const pos = k.mousePos();
      leftMouseHeld = leftButton.exists() && leftButton.hasPoint(pos);
      rightMouseHeld = rightButton.exists() && rightButton.hasPoint(pos);
      setButtonOpacity();
      updateSpriteFromMovement();
    });

    k.onMouseRelease(() => {
      leftMouseHeld = false;
      rightMouseHeld = false;
      setButtonOpacity();
      updateSpriteFromMovement();
    });

    // ------------------------------
    // Enemies
    // ------------------------------
    for (let row = 0; row < p.enemy.rows; row++) {
      for (let col = 0; col < p.enemy.cols; col++) {
        const enemy = k.add([
          k.sprite(p.enemy.spriteSheet.name, { anim: p.enemy.spriteSheet.defaultAnim }),
          k.pos(col * p.enemy.spacing + 30, row * p.enemy.spacing + p.enemy.startY),
          k.scale(enemySpriteScale),
          k.area(),
          "enemy",
        ]);

        const [delayMin, delayMax] = p.enemy.spriteSheet.animStartDelayRange ?? [0, 0];
        const delay = k.rand(delayMin, delayMax);
        const variance = p.enemy.spriteSheet.animSpeedVariance ?? 0;
        const speedFactor = 1 + k.rand(-variance, variance);

        k.wait(delay, () => {
          if (!enemy.exists()) return;
          enemy.play(p.enemy.spriteSheet.defaultAnim, {
            loop: true,
            speed: p.enemy.spriteSheet.animSpeed * speedFactor,
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

      k.add([
        k.rect(4, 12),
        k.pos(
          shooter.pos.x + p.enemy.size / 2 - 2,
          shooter.pos.y + p.enemy.size,
        ),
        k.area(),
        k.color(255, 165, 0),
        k.move(k.DOWN, p.enemyFire.bulletSpeed),
        k.offscreen({ destroy: true }),
        "enemyBullet",
      ]);
    });

    k.onUpdate(() => {
      if (gameOver) return;

      if (isHoldingLeft() || k.isKeyDown("left")) {
        player.move(-p.player.speed, 0);
        if (player.pos.x < playerHalfWidth) player.pos.x = playerHalfWidth;
        updateSpriteFromMovement();
      }

      if (isHoldingRight() || k.isKeyDown("right")) {
        player.move(p.player.speed, 0);
        const maxX = k.width() - playerHalfWidth;
        if (player.pos.x > maxX) player.pos.x = maxX;
        updateSpriteFromMovement();
      }

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

      const reachedLeftEdge = enemyDirection === -1 && minX <= p.enemy.horizontalPadding;
      const reachedRightEdge = enemyDirection === 1 && maxX >= k.width() - p.enemy.horizontalPadding;

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

      if (deathPos) {
        const death = k.add([
          k.sprite(p.enemy.deathSpriteSheet.name, { anim: p.enemy.deathSpriteSheet.animName }),
          k.pos(deathPos.x, deathPos.y),
          k.scale(enemySpriteScale),
          "enemyDeath",
        ]);

        death.play(p.enemy.deathSpriteSheet.animName, {
          loop: false,
          speed: p.enemy.deathSpriteSheet.animSpeed,
        });

        const durationSec = p.enemy.deathSpriteSheet.frames / Math.max(1, p.enemy.deathSpriteSheet.animSpeed);
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
      k.go("space-invaders");
    });
  });
}


