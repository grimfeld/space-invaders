import kaplay from "kaplay";
import { params } from "./spaceInvaders/params.js";
import {
  loadSpaceInvadersAssets,
  registerSpaceInvadersScene
} from "./spaceInvaders/game.js";

// Create and manage the canvas ourselves so we can reliably scale it to fit
// the screen on every device (Kaplay may set inline sizes otherwise).
const canvas = document.createElement("canvas");
canvas.id = "game";
canvas.style.display = "block";
canvas.style.touchAction = "none";
document.body.appendChild(canvas);

const GAME_W = params.canvas.width;
const GAME_H = params.canvas.height;

const resizeCanvasToFitScreen = () => {
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;

  const isCoarsePointer =
    window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

  // Desktop: contain + cap at logical size (max 375×667).
  // Mobile: cover to fill the screen (may crop slightly, but never looks \"shrunk\").
  const containScale = Math.min(vw / GAME_W, vh / GAME_H);
  const coverScale = Math.max(vw / GAME_W, vh / GAME_H);

  const scale = isCoarsePointer ? coverScale : Math.min(1, containScale);

  // Make the canvas fill the chosen scaled size in CSS pixels.
  canvas.style.width = `${Math.ceil(GAME_W * scale)}px`;
  canvas.style.height = `${Math.ceil(GAME_H * scale)}px`;

  // Scale the camera so the 375×667 world fills the canvas consistently.
  // (For cover mode, this effectively crops off the overflow.)
  k?.setCamScale?.(scale);
};

window.addEventListener("resize", resizeCanvasToFitScreen, { passive: true });

const k = kaplay({
  canvas,
  width: GAME_W,
  height: GAME_H,
  background: params.canvas.background
});

k.loadRoot("./"); // A good idea for Itch.io publishing later

registerSpaceInvadersScene(k, params);

(window.visualViewport ?? window).addEventListener?.(
  "resize",
  resizeCanvasToFitScreen,
  { passive: true }
);
resizeCanvasToFitScreen();

(async () => {
  await loadSpaceInvadersAssets(k, params);
  k.go("space-invaders");
})();
