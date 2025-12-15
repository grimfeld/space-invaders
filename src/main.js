import kaplay from "kaplay";
import { params } from "./spaceInvaders/params.js";
import {
  loadSpaceInvadersAssets,
  registerSpaceInvadersScene,
} from "./spaceInvaders/game.js";

const k = kaplay({
  width: params.canvas.width,
  height: params.canvas.height,
  background: params.canvas.background,
});

k.loadRoot("./"); // A good idea for Itch.io publishing later

registerSpaceInvadersScene(k, params);

(async () => {
  await loadSpaceInvadersAssets(k, params);
  k.go("space-invaders");
})();