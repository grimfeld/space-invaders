import type { Params } from "./params";

export type KaplayCtx = ReturnType<typeof import("kaplay").default>;

export type Phase =
  | "intro"
  | "phase1Intro"
  | "phase1"
  | "bossIntro"
  | "boss"
  | "win"
  | "gameOver";

export type { Params };


