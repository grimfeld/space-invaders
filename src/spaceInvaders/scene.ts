import { setupBackground } from "./background";
import type { KaplayCtx, Params, Phase } from "./types";

export function registerSpaceInvadersScene(k: KaplayCtx, p: Params): void {
  k.scene("space-invaders", () => {
    // Internal resolution is fixed by `kaplay({ width, height })`, so cache once.
    const W = k.width();
    const H = k.height();
    let enemyDirection = 1;
    let pendingDrop = false;
    let gameOver = false;
    let phase: Phase = "intro";
    let lives = p.player.lives;
    let spriteLocked = false;
    let gameOverUiShown = false;
    let musicHandle = null;
    let musicStarted = false;

    // Boss state
    /** @type {any} */
    let boss = null;
    let bossDir = 1;
    let bossTime = 0;
    let bossBaseY = 0;
    /** @type {any} */
    let bossHpBarBg = null;
    /** @type {any} */
    let bossHpBarFill = null;
    /** @type {any} */
    let bossHpLabel = null;
    // Intro cutscene state
    let introStep = 0;
    let introT = 0;
    /** @type {any} */
    let introBoss = null;

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
    // Background layer
    // ------------------------------
    const { earthHeightScaled, wrapMargin } = setupBackground(k, p, {
      isGameOver: () => gameOver
    });
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
      W / 2,
      H - (p.player.spawnOffset + playerHalfHeight)
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
    // Reused target vector (avoid per-frame / per-state allocations).
    const playerTarget = player.pos.clone();

    // Intro: player starts off-screen and slides in.
    player.pos.y = H + playerHalfHeight + 80;
    playerTarget.x = player.pos.x;
    playerTarget.y = player.pos.y;

    // Pointer-follow movement bounds (bottom portion of the playfield).
    const movementCfg: any = p.player?.movement ?? {};
    const zoneFrac = movementCfg.zoneHeightFrac ?? 0.1; // bottom 10%
    const bottomPadPx = movementCfg.bottomPadPx ?? 6;

    const moveMinX = playerHalfWidth;
    const moveMaxX = W - playerHalfWidth;

    // Keep the ship above the earth sprite area.
    const moveMaxY = H - earthHeightScaled - playerHalfHeight - bottomPadPx;
    const moveMinY = Math.max(playerHalfHeight, moveMaxY - H * zoneFrac);

    const setPlayerTargetFromPointer = (pos) => {
      playerTarget.x = k.clamp(pos.x, moveMinX, moveMaxX);
      playerTarget.y = k.clamp(pos.y, moveMinY, moveMaxY);
    };

    // ------------------------------
    // Parallax updater (player offset + star drift + wrap)
    // ------------------------------
    // Compute parallax deltas once per frame.
    let parallaxDx = 0;
    let parallaxDy = 0;
    const screenCenterX = W / 2;
    k.onUpdate(() => {
      if (gameOver) return;
      parallaxDx = player.pos.x - screenCenterX;
      parallaxDy = player.pos.y - playerSpawnPos.y;
    });

    // Apply parallax per object (avoids `k.get("bgParallax")` scans / allocations).
    k.onUpdate("bgParallax", (o: any) => {
      if (gameOver) return;

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
        const projectedX = o.basePos.x - parallaxDx * f;
        if (projectedX < -margin) o.basePos.x += wrapW;
        if (projectedX > k.width() + margin) o.basePos.x -= wrapW;

        const topY = pad;
        const botY = Math.max(pad, maxY - pad);
        if (o.basePos.y < topY) o.basePos.y = botY;
        if (o.basePos.y > botY) o.basePos.y = topY;
      }

      o.pos.x = o.basePos.x - parallaxDx * f;
      o.pos.y = o.basePos.y - parallaxDy * fy;
    });

    const applySprite = (state) => {
      const spriteName = p.player.spriteSheets[state].name;
      const animName = state;
      player.use(k.sprite(spriteName, { anim: animName }));
      currentPlayerState = state;
    };

    const setPlayerState = (state, options: { force?: boolean } = {}) => {
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

    //TODO: Create custom class for health bars (maybe ?)

    // Player health bar (represents current lives) - drawn under the ship.
    const playerMaxLives = p.player.lives;
    const playerHpBarW = Math.max(28, Math.round(p.player.width * 0.95));
    const playerHpBarH = 6;
    const playerHpBarOffsetY = 10;

    const playerHpBarBg = k.add([
      k.rect(playerHpBarW, playerHpBarH),
      k.pos(player.pos.x, player.pos.y + playerHalfHeight + playerHpBarOffsetY),
      k.anchor("center"),
      k.color(35, 35, 35),
      k.z(500),
      "playerHp"
    ]);

    const playerHpBarFill = k.add([
      k.rect(playerHpBarW, playerHpBarH),
      // Left edge of the bar, so scaling X shrinks/grows correctly
      k.pos(
        player.pos.x - playerHpBarW / 2,
        player.pos.y + playerHalfHeight + playerHpBarOffsetY
      ),
      k.anchor("left"),
      k.color(90, 255, 140),
      k.scale(1, 1),
      k.z(501),
      "playerHp"
    ]);

    const updatePlayerHpBar = () => {
      // Hide if game over / win screens are up.
      const hidden = gameOver || phase === "win" || phase === "gameOver";
      playerHpBarBg.hidden = hidden;
      playerHpBarFill.hidden = hidden;
      if (hidden) return;

      const ratio =
        playerMaxLives > 0 ? k.clamp(lives / playerMaxLives, 0, 1) : 0;
      playerHpBarFill.scale.x = ratio;
    };

    const updateBossHpLabel = () => {
      // Health bar UI is only visible during boss phase.
      const show =
        !!boss &&
        boss.exists &&
        boss.exists() &&
        (phase === "boss" || phase === "bossIntro");
      if (bossHpBarBg) bossHpBarBg.hidden = !show;
      if (bossHpBarFill) bossHpBarFill.hidden = !show;
      if (bossHpLabel) bossHpLabel.hidden = !show;
      if (!show) return;

      const ratio = boss.maxHp > 0 ? k.clamp(boss.hp / boss.maxHp, 0, 1) : 0;
      if (bossHpBarFill?.scale) bossHpBarFill.scale.x = ratio;

      // Keep a small numeric label for now (useful for tuning).
      bossHpLabel.text = `${Math.max(0, boss.hp)} / ${boss.maxHp}`;
    };

    //TODO: Extract this to a helper class or helper functions
    const showCenteredText = (label: string, color: [number, number, number]) =>
      k.add([
        k.text(label, { size: 48 }),
        k.pos(W / 2, H / 2),
        k.anchor("center"),
        k.color(...color),
        "ui"
      ]);

    const startBossPhase = () => {
      if (gameOver) return;
      if (phase !== "phase1") return;
      phase = "bossIntro";

      // Clear any remaining enemies / bullets / death FX (safe even when called normally).
      k.get("enemy").forEach((e) => k.destroy(e));
      k.get("enemyBullet").forEach((b) => k.destroy(b));
      k.get("enemyDeath").forEach((d) => k.destroy(d));
      k.get("bossBullet").forEach((bb) => k.destroy(bb));

      bossDir = 1;
      bossTime = 0;

      const cfg = p.boss;
      const bossScale = enemySpriteScale * cfg.scaleMultiplier;
      bossBaseY = k.height() * cfg.yFrac;

      boss = k.add([
        k.sprite(p.enemy.spriteSheet.name, {
          anim: p.enemy.spriteSheet.defaultAnim
        }),
        // Spawn above the screen and slide in.
        k.pos(k.width() / 2, -120),
        k.anchor("center"),
        k.scale(bossScale),
        k.area(),
        "boss"
      ]);

      boss.hp = cfg.hp;
      boss.maxHp = cfg.hp;

      // Boss HP bar (background + fill). Fill anchors on the left so scaling works.
      const barW = Math.floor(k.width() * 0.62);
      const barH = 10;
      const barY = 18;

      if (!bossHpBarBg) {
        bossHpBarBg = k.add([
          k.rect(barW, barH),
          k.pos(k.width() / 2, barY),
          k.anchor("center"),
          k.fixed(),
          k.color(40, 40, 40),
          k.z(1000),
          "ui"
        ]);
      }

      if (!bossHpBarFill) {
        bossHpBarFill = k.add([
          k.rect(barW, barH),
          // Left edge of the bar
          k.pos(k.width() / 2 - barW / 2, barY),
          k.anchor("left"),
          k.fixed(),
          k.color(255, 80, 80),
          k.scale(1, 1),
          k.z(1001),
          "ui"
        ]);
      }

      if (!bossHpLabel) {
        bossHpLabel = k.add([
          k.text("", { size: 14 }),
          k.pos(k.width() / 2, barY + 14),
          k.anchor("center"),
          k.fixed(),
          k.color(255, 220, 220),
          k.z(1002),
          "ui"
        ]);
      }

      updateBossHpLabel();
    };

    //TDOO: Move this to a debug specific code
    // Dev-only: quick phase switching hotkeys.
    const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
    if (isDev && (p.debug?.phaseSwitch ?? true)) {
      // 1: restart into Phase 1 (intro will play)
      k.onKeyPress("1", () => {
        stopMusic();
        k.go("space-invaders");
      });
      // 2: force start boss phase immediately
      k.onKeyPress("2", () => {
        if (gameOver) return;
        if (phase === "boss" || phase === "bossIntro") return;
        startBossPhase();
      });
    }

    const startPhase1 = () => {
      if (gameOver) return;
      if (phase === "phase1" || phase === "phase1Intro") return;
      phase = "phase1Intro";
      spriteLocked = false;
      if (introBoss && introBoss.exists()) k.destroy(introBoss);
      introBoss = null;
      spawnPhase1Enemies();
    };

    const triggerGameOver = (message = "GAME OVER") => {
      gameOver = true;
      phase = "gameOver";
      spriteLocked = true;
      stopMusic();
      if (gameOverUiShown) return;
      gameOverUiShown = true;
      showCenteredText(message, [255, 0, 0]);
      k.add([
        k.text("Press R to restart", { size: 18 }),
        k.pos(W / 2, H / 2 + 48),
        k.anchor("center"),
        k.color(255, 255, 255),
        "ui"
      ]);
    };

    const triggerWin = () => {
      if (gameOver) return;
      gameOver = true;
      phase = "win";
      spriteLocked = true;
      stopMusic();
      setPlayerState("idle", { force: true });
      showCenteredText("YOU WIN!", [0, 255, 0]);
      k.add([
        k.text("Press R to restart", { size: 18 }),
        k.pos(W / 2, H / 2 + 48),
        k.anchor("center"),
        k.color(255, 255, 255),
        "ui"
      ]);
    };

    const handlePlayerHit = (forceGameOver = false) => {
      if (gameOver) return;

      spriteLocked = true;

      if (forceGameOver) {
        lives = 0;
      } else {
        lives -= 1;
      }

      updatePlayerHpBar();

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

      // Don't reset player position on hit; just freeze movement in place.
      playerTarget.x = player.pos.x;
      playerTarget.y = player.pos.y;
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
      // No shooting during cutscenes.
      if (phase !== "phase1" && phase !== "boss") return;
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

    // Intro cutscene is non-interactive (pointer still unlocks music, but we ignore target changes).
    // We'll overwrite playerTarget during the intro update loop.

    k.onKeyPress("r", () => {
      if (!gameOver) return;
      stopMusic();
      k.go("space-invaders");
    });

    // ------------------------------
    // Enemies (spawned when Phase 1 starts)
    // ------------------------------
    // Track enemy count so we don't need `k.get("enemy").length` in hot paths.
    let enemyCount = 0;
    const spawnPhase1Enemies = () => {
      //TODO: Simplify this loop in a loop using a matrix
      for (let row = 0; row < p.enemy.rows; row++) {
        for (let col = 0; col < p.enemy.cols; col++) {
          const targetY = row * p.enemy.spacing + p.enemy.startY;
          const enemy: any = k.add([
            k.sprite(p.enemy.spriteSheet.name, {
              anim: p.enemy.spriteSheet.defaultAnim
            }),
            k.pos(
              col * p.enemy.spacing + 30,
              // Start above the screen; slide down into formation.
              -(60 + row * 26 + k.rand(0, 40))
            ),
            k.scale(enemySpriteScale),
            k.area(),
            "enemy"
          ]);
          enemyCount += 1;
          enemy.onDestroy(() => {
            enemyCount -= 1;
          });
          enemy.slideTargetY = targetY;

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
    };

    k.loop(p.enemyFire.interval, () => {
      if (gameOver) return;
      if (phase !== "phase1") return;
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

    // Boss shooting loop (spread barrage)
    k.loop(p.boss.shootInterval, () => {
      if (gameOver) return;
      if (phase !== "boss") return;
      if (!boss || !boss.exists()) return;

      const cfg = p.boss;
      const n = Math.max(1, cfg.spreadCount);
      const totalDeg = cfg.spreadAngleDeg;

      // Play the same fire SFX for now (can be swapped later).
      k.play(p.sounds.enemyFire.name, { volume: p.sounds.enemyFire.volume });

      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1); // 0..1
        const angleDeg = (t - 0.5) * totalDeg; // centered around 0
        const a = (angleDeg * Math.PI) / 180;
        // Down is (0, 1). Rotate by angle around down-axis.
        const dir = k.vec2(Math.sin(a), Math.cos(a));

        k.add([
          k.rect(5, 14),
          k.pos(boss.pos.x, boss.pos.y + 18),
          k.anchor("center"),
          k.area(),
          k.color(255, 60, 60),
          k.move(dir, cfg.bulletSpeed),
          k.offscreen({ destroy: true }),
          "bossBullet"
        ]);
      }
    });

    k.onUpdate(() => {
      if (gameOver) return;

      // Slide toward pointer target at fixed speed (px/sec).
      const dt = k.dt();
      if (phase === "intro") {
        // Simple scripted intro timeline.
        spriteLocked = true;
        introT += dt;

        const playerInY = playerSpawnPos.y;
        const playerStartY = H + playerHalfHeight + 80;
        const playerSlideSpeed = 320;
        const bossIntroY = H * 0.22;
        const bossScale = enemySpriteScale * p.boss.scaleMultiplier;

        // Step 0: slide player in
        if (introStep === 0) {
          // Move up toward spawn
          player.pos.y = Math.max(
            playerInY,
            player.pos.y - playerSlideSpeed * dt
          );
          player.pos.x = playerSpawnPos.x;
          playerTarget.x = player.pos.x;
          playerTarget.y = player.pos.y;

          if (player.pos.y <= playerInY + 0.5) {
            player.pos.y = playerInY;
            introStep = 1;
            introT = 0;
          }
        }

        // Step 1: boss appears (slides in) and player \"stumbles\"
        if (introStep === 1) {
          if (!introBoss) {
            introBoss = k.add([
              k.sprite(p.enemy.spriteSheet.name, {
                anim: p.enemy.spriteSheet.defaultAnim
              }),
              k.pos(W / 2, -140),
              k.anchor("center"),
              k.scale(bossScale),
              "introBoss"
            ]);
          }
          introBoss.pos.y += 220 * dt;
          if (introBoss.pos.y > bossIntroY) introBoss.pos.y = bossIntroY;

          //TODO: remove the shake
          // Stumble: small shake for ~0.6s once boss is in.
          if (introBoss.pos.y === bossIntroY) {
            const shakeT = Math.min(0.6, introT);
            const shake = Math.sin(shakeT * 40) * 3 * (1 - shakeT / 0.6);
            player.pos.x = playerSpawnPos.x + shake;
            playerTarget.x = player.pos.x;
            playerTarget.y = player.pos.y;
            if (introT >= 0.9) {
              player.pos.x = playerSpawnPos.x;
              introStep = 2;
              introT = 0;
            }
          }
        }

        // Step 2: boss calls minions
        if (introStep === 2) {
          playerTarget.x = player.pos.x;
          playerTarget.y = player.pos.y;
          if (introT >= 1.0) {
            introStep = 3;
            introT = 0;
          }
        }

        // Step 3: boss slides out the top, then Phase 1 begins
        if (introStep === 3) {
          if (introBoss && introBoss.exists()) {
            introBoss.pos.y -= 260 * dt;
            if (introBoss.pos.y < -200) {
              k.destroy(introBoss);
              introBoss = null;
              // Start Phase 1 enemies now.
              startPhase1();
            }
          } else {
            // Safety fallback
            startPhase1();
          }
        }

        // Keep HP bar attached under the ship.
        playerHpBarBg.pos.x = player.pos.x;
        playerHpBarBg.pos.y =
          player.pos.y + playerHalfHeight + playerHpBarOffsetY;
        playerHpBarFill.pos.x = player.pos.x - playerHpBarW / 2;
        playerHpBarFill.pos.y =
          player.pos.y + playerHalfHeight + playerHpBarOffsetY;
        updatePlayerHpBar();
        return;
      }
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

      // TODO: refacttor to limit code duplication from lines 691 to 697
      // Keep HP bar attached under the ship.
      playerHpBarBg.pos.x = player.pos.x;
      playerHpBarBg.pos.y =
        player.pos.y + playerHalfHeight + playerHpBarOffsetY;
      playerHpBarFill.pos.x = player.pos.x - playerHpBarW / 2;
      playerHpBarFill.pos.y =
        player.pos.y + playerHalfHeight + playerHpBarOffsetY;
      updatePlayerHpBar();

      if (phase === "phase1Intro") {
        const enemies = k.get("enemy");
        if (enemies.length === 0) {
          phase = "phase1";
          return;
        }

        const slideSpeed = p.enemy.introSlideSpeed ?? 260;
        let allArrived = true;

        enemies.forEach((e) => {
          if (typeof e.slideTargetY !== "number") return;
          if (e.pos.y < e.slideTargetY) {
            e.pos.y = Math.min(e.slideTargetY, e.pos.y + slideSpeed * dt);
            allArrived = false;
          }
        });

        if (allArrived) {
          phase = "phase1";
        }
      } else if (phase === "phase1") {
        const enemies = k.get("enemy");
        if (enemies.length === 0) return;

        const dropY = pendingDrop ? p.enemy.dropDistance : 0;
        pendingDrop = false;
        const moveX = p.enemy.speed * enemyDirection;
        let minX = Infinity;
        let maxX = -Infinity;
        const playerTop = player.pos.y - playerHalfHeight;

        // Single pass: optional drop, move, bounds, and overrun check.
        for (let i = 0; i < enemies.length; i++) {
          const enemy: any = enemies[i];
          if (dropY) enemy.pos.y += dropY;
          enemy.move(moveX, 0);

          const x = enemy.pos.x;
          if (x < minX) minX = x;
          const enemyRight = x + p.enemy.size;
          if (enemyRight > maxX) maxX = enemyRight;

          // Immediate loss if invaders reach the ship line.
          if (enemy.pos.y + p.enemy.size >= playerTop) {
            handlePlayerHit(true);
            return;
          }
        }

        const reachedLeftEdge =
          enemyDirection === -1 && minX <= p.enemy.horizontalPadding;
        const reachedRightEdge =
          enemyDirection === 1 && maxX >= W - p.enemy.horizontalPadding;

        if (reachedLeftEdge || reachedRightEdge) {
          enemyDirection *= -1;
          pendingDrop = true;
        }
      } else if (phase === "bossIntro") {
        if (!boss || !boss.exists()) return;
        const cfg = p.boss;
        // Slide down into position at a fixed speed.
        boss.pos.y += cfg.introSlideSpeed * dt;
        if (boss.pos.y >= bossBaseY) {
          boss.pos.y = bossBaseY;
          phase = "boss";
        }
        updateBossHpLabel();
      } else if (phase === "boss") {
        if (!boss || !boss.exists()) return;
        bossTime += dt;

        const cfg = p.boss;
        const bossScale = enemySpriteScale * cfg.scaleMultiplier;
        const bossHalfW = (p.enemy.spriteSheet.frameWidth * bossScale) / 2;
        const leftBound = cfg.sweepPadding + bossHalfW;
        const rightBound = W - cfg.sweepPadding - bossHalfW;

        // Vertical bob around base Y.
        boss.pos.y = bossBaseY + Math.sin(bossTime * cfg.bobSpeed) * cfg.bobAmp;

        boss.move(cfg.speed * bossDir, 0);
        if (boss.pos.x <= leftBound) {
          boss.pos.x = leftBound;
          bossDir = 1;
        } else if (boss.pos.x >= rightBound) {
          boss.pos.x = rightBound;
          bossDir = -1;
        }
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
        //TODO: Better handle sprite sheets to load all sprite states as one.
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

      if (enemyCount <= 0) {
        // End of Phase 1: start boss phase instead of winning.
        startBossPhase();
      }
    });

    k.onCollide("bullet", "boss", (bullet, b) => {
      if (phase !== "boss") return;
      if (!b.exists()) return;
      k.destroy(bullet);

      b.hp -= 1;
      updateBossHpLabel();

      if (b.hp > 0) return;

      // Boss defeated.
      // TODO: Add a victory song
      phase = "win";
      k.play(p.sounds.enemyDeath.name, { volume: p.sounds.enemyDeath.volume });

      const bossPos = b.pos
        ? k.vec2(b.pos.x, b.pos.y)
        : k.vec2(k.width() / 2, bossBaseY);
      k.destroy(b);
      boss = null;
      updateBossHpLabel();

      // Clear boss bullets.
      k.get("bossBullet").forEach((bb) => k.destroy(bb));

      // Reuse existing enemy death spritesheet as a placeholder big explosion.
      const cfg = p.boss;
      const bossScale = enemySpriteScale * cfg.scaleMultiplier;
      const deathFx = k.add([
        k.sprite(p.enemy.deathSpriteSheet.name, {
          anim: p.enemy.deathSpriteSheet.animName
        }),
        k.pos(bossPos.x, bossPos.y),
        k.anchor("center"),
        k.scale(bossScale),
        "enemyDeath"
      ]);
      deathFx.play(p.enemy.deathSpriteSheet.animName, {
        loop: false,
        speed: p.enemy.deathSpriteSheet.animSpeed
      });

      const durationSec =
        p.enemy.deathSpriteSheet.frames /
        Math.max(1, p.enemy.deathSpriteSheet.animSpeed);
      k.wait(durationSec + 0.05, () => {
        if (deathFx.exists()) k.destroy(deathFx);
        triggerWin();
      });
    });

    k.onCollide("enemy", "player", () => {
      handlePlayerHit();
    });

    k.onCollide("enemyBullet", "player", (enemyBullet) => {
      k.destroy(enemyBullet);
      handlePlayerHit();
    });

    k.onCollide("bossBullet", "player", (bossBullet) => {
      k.destroy(bossBullet);
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
