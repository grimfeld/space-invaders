import type { KaplayCtx, Params, Phase } from "./types";

export function registerDevHotkeys(
  k: KaplayCtx,
  p: Params,
  opts: {
    stopMusic: () => void;
    startBossPhase: () => void;
    getPhase: () => Phase;
    isGameOver: () => boolean;
  }
): void {
  const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
  if (!isDev) return;
  if (!(p.debug?.phaseSwitch ?? true)) return;

  // 1: restart into Phase 1 (intro will play)
  k.onKeyPress("1", () => {
    opts.stopMusic();
    k.go("space-invaders");
  });

  // 2: force start boss phase immediately
  k.onKeyPress("2", () => {
    if (opts.isGameOver()) return;
    const phase = opts.getPhase();
    if (phase === "boss" || phase === "bossIntro") return;
    opts.startBossPhase();
  });
}


