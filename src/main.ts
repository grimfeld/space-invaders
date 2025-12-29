import kaplay from "kaplay";
import { params } from "./spaceInvaders/params";
import {
  loadSpaceInvadersAssets,
  registerSpaceInvadersScene,
} from "./spaceInvaders/game";

const root = document.getElementById("game-root") ?? document.body;

const k = kaplay({
  width: params.canvas.width,
  height: params.canvas.height,
  // Let Kaplay manage resizing / input coordinate mapping.
  stretch: true,
  // Preserve aspect ratio when fitting into the parent container.
  // (Prevents non-uniform scaling / sprite morphing.)
  letterbox: true,
  root,
  background: params.canvas.background,
});

k.loadRoot("./"); // A good idea for Itch.io publishing later

registerSpaceInvadersScene(k, params);

(async () => {
  await loadSpaceInvadersAssets(k, params);
  k.go("space-invaders");
})();


