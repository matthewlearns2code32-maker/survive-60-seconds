// =====================================================================
//  SURVIVE 60 SECONDS  —  game.js
//  Milestone 4: make it feel good — running animation, defenders that
//  spread out, trophy sparkles, tackle shake, countdown, best score.
//  Grab trophies, dodge defenders, last 60 seconds to win.
// =====================================================================


// ---------------------------------------------------------------------
//  SETTINGS — the numbers you'll most want to play with live here.
// ---------------------------------------------------------------------
const SETTINGS = {
  // Player
  playerSpeed: 160,       // how many pixels the player moves per SECOND
  pixelSize: 2,           // how big each "pixel" of a sprite is drawn
  fieldMargin: 12,        // gap between the canvas edge and the white sideline

  // The round
  roundSeconds: 60,       // survive this long to win
  startingHearts: 3,      // hits you can take
  graceSeconds: 1.5,      // after a hit, you can't be hit again for this long
  countdownSeconds: 3,    // the 3-2-1 before each round

  // Trophies
  trophyPoints: 1,        // points for each trophy

  // Defenders
  defenderSpeed: 80,      // average defender speed (pixels per second)
  startingDefenders: 3,   // defenders on the field when the round starts
  newDefenderEvery: 5,   // seconds between new defenders joining
  safeSpawnDistance: 150, // new defenders appear at least this far from you
  defenderPersonalSpace: 18, // defenders keep at least this far apart

  // Cloak (your special ability — press SPACE)
  cloakSeconds: 4,         // how long you're invisible and the decoy is out
  cloakRechargeSeconds: 15, // wait this long after a cloak ends to use it again
  cloakExitSafety: 0.5,    // safe time when the cloak ends, in case you're
                           // standing inside a defender at that moment

  // Effects (how strong the "game feel" is)
  stepLength: 7,          // pixels travelled per running step (smaller = faster legs)
  shakeSeconds: 0.3,      // how long the screen shakes when you're tackled
  shakeStrength: 4,       // how far (pixels) the screen shakes
  sparkleCount: 14,       // gold bits that burst out of a trophy
};

// Colors used on the field (retro-style palette).
const COLORS = {
  grassLight: "#3fa34d",
  grassDark: "#358a41",
  lines: "#f4f0d9",
  shadow: "rgba(0, 0, 0, 0.35)",
  text: "#ffd23f",
  textOutline: "#14121f",
  tackleFlash: "#e63946",
};


// ---------------------------------------------------------------------
//  SPRITES — tiny pictures drawn from letters.
//  Each letter is one pixel. A "." means "leave this pixel empty".
//  The color for each letter comes from a matching color list.
// ---------------------------------------------------------------------
const PLAYER_SPRITE = [
  "..HHHH..",
  "..SSSS..",
  "..SESE..",
  ".JJJJJJ.",
  "SJJNNJJS",
  "S.JJJJ.S",
  "..BBBB..",
  "..B..B..",
  "..S..S..",
  ".KK..KK.",
];

// Running = flipping between two pictures, like a flipbook.
// Both frames reuse the top 7 rows (head + body) of PLAYER_SPRITE,
// so if you redesign the head, the running frames change too.
const RUN_FRAME_A = [   // legs stretched apart
  ...PLAYER_SPRITE.slice(0, 7),
  ".B....B.",
  ".S....S.",
  "KK....KK",
];

const RUN_FRAME_B = [   // legs passing each other
  ...PLAYER_SPRITE.slice(0, 7),
  "...BB...",
  "...SS...",
  "..KKK...",
];

const PLAYER_COLORS = {
  H: "#3b2314", // hair
  S: "#e0a878", // skin
  E: "#14121f", // eyes
  J: "#4f12b8", // jersey
  N: "#f4f0d9", // jersey number
  B: "#1d3557", // shorts
  K: "#ffd23f", // cleats
};

// Defenders use the SAME sprite shape as you, just a different team kit.
const DEFENDER_COLORS = {
  H: "#14121f", // hair
  S: "#c68642", // skin
  E: "#14121f", // eyes
  J: "#e63946", // jersey
  N: "#14121f", // jersey number
  B: "#f4f0d9", // shorts
  K: "#14121f", // cleats
};

const TROPHY_SPRITE = [
  "Y.YYY.Y",
  "Y.YWY.Y",
  ".YYYYY.",
  "..YYY..",
  "...Y...",
  "...Y...",
  "..OOO..",
  ".OOOOO.",
];

const TROPHY_COLORS = {
  Y: "#ffd23f", // gold
  W: "#fff8d6", // shine
  O: "#6b3e1f", // wooden base
};


// ---------------------------------------------------------------------
//  SETUP — grab the canvas, its 2D "paintbrush" (ctx), and the HUD.
// ---------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const heartsText = document.getElementById("hearts");
const timerText = document.getElementById("timer");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const startButton = document.getElementById("start-button");
const cloakFill = document.getElementById("cloak-fill");
const cloakLabel = document.getElementById("cloak-label");
const arena = document.getElementById("arena");
const fullscreenButton = document.getElementById("fullscreen-button");

// The playable area: the inside of the white sideline.
const field = {
  left: SETTINGS.fieldMargin,
  top: SETTINGS.fieldMargin,
  right: canvas.width - SETTINGS.fieldMargin,
  bottom: canvas.height - SETTINGS.fieldMargin,
};

// A sprite's size in pixels: columns x rows x pixelSize.
function spriteWidth(sprite) { return sprite[0].length * SETTINGS.pixelSize; }
function spriteHeight(sprite) { return sprite.length * SETTINGS.pixelSize; }

const player = {
  width: spriteWidth(PLAYER_SPRITE),
  height: spriteHeight(PLAYER_SPRITE),
  x: 0,
  y: 0,
  moving: false,  // is the player running right now? (for the animation)
  stride: 0,      // total distance run, used to pick the running frame
};


// ---------------------------------------------------------------------
//  BEST SCORE — saved in the browser so it's still there tomorrow.
//  localStorage is a tiny notebook each website gets in your browser.
//  (try/catch: if the browser blocks it, the game still works.)
// ---------------------------------------------------------------------
const BEST_SCORE_KEY = "survive60-best";

function loadBestScore() {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // Couldn't save — no problem, it just won't be remembered.
  }
}


// ---------------------------------------------------------------------
//  GAME STATE — everything that changes during a round, in one place.
//  `state` is always ONE of: "start", "countdown", "playing", "won", "lost".
// ---------------------------------------------------------------------
const game = {
  state: "start",
  score: 0,
  best: loadBestScore(),
  hearts: 0,
  timeLeft: 0,        // seconds left in the round
  graceLeft: 0,       // seconds of "can't be hit" left after a hit
  nextDefenderIn: 0,  // seconds until another defender joins
  defenders: [],
  trophy: null,
  clock: 0,           // total time the page has been running (for animations)
  countdownLeft: 0,   // seconds left in the 3-2-1
  goLeft: 0,          // how long "GO!" stays on screen

  // The cloak is in ONE of three situations, decided by these two timers:
  //   READY      -> cloakLeft is 0 and cloakRecharge is 0
  //   ACTIVE     -> cloakLeft is more than 0
  //   RECHARGING -> cloakRecharge is more than 0
  cloakLeft: 0,       // seconds of cloak remaining
  cloakRecharge: 0,   // seconds until the cloak can be used again
  decoy: null,        // the fake player, only while cloaked

  // Effects — these are just for looks; they never change the rules.
  particles: [],      // little flying pixels (trophy sparkles, tackle dust)
  popups: [],         // floating text like "+1"
  shakeLeft: 0,       // seconds of screen shake left
  flashLeft: 0,       // seconds of red tackle flash left
};


// ---------------------------------------------------------------------
//  INPUT — remember which keys are currently held down.
//  (These listeners are added ONCE. Restarting never adds more.)
// ---------------------------------------------------------------------
const keysDown = new Set();

window.addEventListener("keydown", (event) => {
  keysDown.add(event.code);

  // Stop arrow keys and Space from scrolling the web page.
  if (event.code.startsWith("Arrow") || event.code === "Space") {
    event.preventDefault();
  }

  // F switches fullscreen on and off (Esc also leaves fullscreen).
  if (event.code === "KeyF" && !event.repeat) {
    toggleFullscreen();
  }

  if (event.code === "Space" || event.code === "Enter") {
    if (game.state === "playing") {
      // During a round, SPACE uses the cloak. `event.repeat` is true when
      // the key is being HELD (auto-repeat), so holding SPACE only counts once.
      if (event.code === "Space" && !event.repeat) useCloak();
    } else {
      // Between rounds, Space or Enter starts a new one.
      startRound();
    }
  }
});

window.addEventListener("keyup", (event) => {
  keysDown.delete(event.code);
});

// If the window loses focus (you click elsewhere), forget held keys
// so the player doesn't keep running on its own.
window.addEventListener("blur", () => keysDown.clear());

startButton.addEventListener("click", () => {
  startButton.blur(); // so Space doesn't "click" the hidden button later
  startRound();
});

function isHeld(...codes) {
  return codes.some((code) => keysDown.has(code));
}


// ---------------------------------------------------------------------
//  FULLSCREEN — make the arena fill the whole screen, for bigger,
//  easier-to-see gameplay. The browser does the hard work; style.css
//  (the ".arena:fullscreen" rules) makes everything grow to fit.
// ---------------------------------------------------------------------
function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    // .catch: if the browser says no, just stay in the normal view.
    arena.requestFullscreen().catch(() => {});
  }
}

fullscreenButton.addEventListener("click", () => {
  fullscreenButton.blur(); // so Space doesn't press this button later
  toggleFullscreen();
});

// Whenever fullscreen turns on or off (button, F, or Esc), update the label.
document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement
    ? "EXIT FULLSCREEN"
    : "⛶ FULLSCREEN";
});


// ---------------------------------------------------------------------
//  STARTING AND ENDING A ROUND
// ---------------------------------------------------------------------

// Put everything back to how a fresh round begins.
function resetRound() {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height / 2 - player.height / 2;
  player.moving = false;

  game.score = 0;
  game.hearts = SETTINGS.startingHearts;
  game.timeLeft = SETTINGS.roundSeconds;
  game.graceLeft = 0;
  game.nextDefenderIn = SETTINGS.newDefenderEvery;
  game.cloakLeft = 0;
  game.cloakRecharge = 0;
  game.decoy = null;
  game.particles = [];
  game.popups = [];
  game.shakeLeft = 0;
  game.flashLeft = 0;
  game.goLeft = 0;

  game.defenders = [];
  for (let i = 0; i < SETTINGS.startingDefenders; i++) {
    game.defenders.push(makeDefender());
  }
  game.trophy = makeTrophy();
}

function startRound() {
  // Already counting down or playing: do nothing.
  if (game.state === "countdown" || game.state === "playing") return;
  resetRound();
  game.state = "countdown";
  game.countdownLeft = SETTINGS.countdownSeconds;
  overlay.classList.add("hidden");
}

function endRound(result) {
  game.state = result; // "won" or "lost"

  const trophies = game.score === 1 ? "1 trophy" : `${game.score} trophies`;
  let message;
  if (result === "won") {
    message = `Full ${SETTINGS.roundSeconds} seconds, and you grabbed ${trophies}.`;
  } else {
    const lasted = Math.floor(SETTINGS.roundSeconds - game.timeLeft);
    message = `You lasted ${lasted} seconds and grabbed ${trophies}.`;
  }

  // New best score?
  if (game.score > game.best) {
    game.best = game.score;
    saveBestScore(game.best);
    message += " NEW BEST SCORE!";
  }

  showOverlay(result === "won" ? "YOU SURVIVED!" : "TACKLED!", message);
  startButton.textContent = "PLAY AGAIN";
}

function showOverlay(title, message) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlay.classList.remove("hidden");
}


// ---------------------------------------------------------------------
//  THE CLOAK — your special ability.
//  Leave a decoy where you're standing, turn invisible, and walk
//  straight through defenders while they chase the fake you.
// ---------------------------------------------------------------------
function isCloaked() {
  return game.cloakLeft > 0;
}

function cloakIsReady() {
  return game.cloakLeft === 0 && game.cloakRecharge === 0;
}

function useCloak() {
  if (!cloakIsReady()) return; // still active or recharging: ignore
  game.cloakLeft = SETTINGS.cloakSeconds;
  game.decoy = { x: player.x, y: player.y, width: player.width, height: player.height };
}

// Count the cloak's timers down each frame.
function updateCloak(seconds) {
  if (isCloaked()) {
    game.cloakLeft -= seconds;
    if (game.cloakLeft <= 0) {
      // Cloak over: the decoy vanishes, recharging begins, and you get
      // a moment of safety in case a defender is right on top of you.
      game.cloakLeft = 0;
      game.decoy = null;
      game.cloakRecharge = SETTINGS.cloakRechargeSeconds;
      game.graceLeft = Math.max(game.graceLeft, SETTINGS.cloakExitSafety);
    }
  } else {
    game.cloakRecharge = Math.max(0, game.cloakRecharge - seconds);
  }
}


// ---------------------------------------------------------------------
//  MAKING THINGS — trophies and defenders appear at random spots.
// ---------------------------------------------------------------------

// Find a random spot on the field at least `minDistance` from the player.
function randomSpot(width, height, minDistance) {
  let spot;
  for (let attempt = 0; attempt < 100; attempt++) {
    spot = {
      x: field.left + Math.random() * (field.right - field.left - width),
      y: field.top + Math.random() * (field.bottom - field.top - height),
    };
    const distance = Math.hypot(
      (spot.x + width / 2) - (player.x + player.width / 2),
      (spot.y + height / 2) - (player.y + player.height / 2)
    );
    if (distance >= minDistance) return spot;
  }
  return spot; // couldn't find a far spot; use the last try
}

function makeDefender() {
  const width = spriteWidth(PLAYER_SPRITE);
  const height = spriteHeight(PLAYER_SPRITE);
  const spot = randomSpot(width, height, SETTINGS.safeSpawnDistance);
  return {
    x: spot.x,
    y: spot.y,
    width,
    height,
    // Each defender is a little faster or slower (85%–115%).
    speed: SETTINGS.defenderSpeed * (0.85 + Math.random() * 0.3),
    moving: true,
    stride: Math.random() * 20, // start mid-step so they don't all run in sync
  };
}

function makeTrophy() {
  const width = spriteWidth(TROPHY_SPRITE);
  const height = spriteHeight(TROPHY_SPRITE);
  const spot = randomSpot(width, height, 50);
  return { x: spot.x, y: spot.y, width, height };
}


// ---------------------------------------------------------------------
//  COLLISIONS — do two rectangles overlap?
//  `shrink` makes the boxes a bit smaller than the pictures, so
//  "barely touching" doesn't count. That feels fairer to the player.
// ---------------------------------------------------------------------
function overlaps(a, b, shrink = 0) {
  return (
    a.x + shrink < b.x + b.width - shrink &&
    a.x + a.width - shrink > b.x + shrink &&
    a.y + shrink < b.y + b.height - shrink &&
    a.y + a.height - shrink > b.y + shrink
  );
}


// ---------------------------------------------------------------------
//  UPDATE — change the game world a little bit each frame.
//  `seconds` is how much time passed since the last frame (e.g. 0.016).
// ---------------------------------------------------------------------
function update(seconds) {
  game.clock += seconds;

  // Effects keep animating even after the round ends,
  // so the last tackle still shakes and sparkles finish.
  updateEffects(seconds);

  // --- The 3-2-1 countdown ---
  if (game.state === "countdown") {
    game.countdownLeft -= seconds;
    if (game.countdownLeft <= 0) {
      game.state = "playing";
      game.goLeft = 0.7; // show "GO!" briefly
    }
    return;
  }

  // Nothing else moves unless a round is being played.
  if (game.state !== "playing") return;

  movePlayer(seconds);
  updateCloak(seconds);

  // --- The clock ---
  game.timeLeft -= seconds;
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    endRound("won");
    return;
  }

  // --- Reinforcements: another defender every few seconds ---
  //     (Not in the final second — nobody joins right at the buzzer.)
  game.nextDefenderIn -= seconds;
  if (game.nextDefenderIn <= 0 && game.timeLeft > 1) {
    game.defenders.push(makeDefender());
    game.nextDefenderIn += SETTINGS.newDefenderEvery;
  }

  moveDefenders(seconds);
  spreadOutDefenders();

  // --- Trophy pickup ---
  if (overlaps(player, game.trophy)) {
    game.score += SETTINGS.trophyPoints;
    celebrateTrophy(game.trophy);
    game.trophy = makeTrophy(); // a new one appears somewhere else
  }

  // --- Getting tackled ---
  //     You can't be tackled while cloaked (you walk right through them)
  //     or during a grace period.
  game.graceLeft = Math.max(0, game.graceLeft - seconds);
  const tackled = game.defenders.some((d) => overlaps(player, d, 3));
  if (tackled && game.graceLeft === 0 && !isCloaked()) {
    game.hearts -= 1;
    game.graceLeft = SETTINGS.graceSeconds;
    tackleFeedback();
    if (game.hearts <= 0) endRound("lost");
  }
}

function movePlayer(seconds) {
  // 1. Turn keys into a direction: -1, 0, or +1 on each axis.
  let dirX = 0;
  let dirY = 0;
  if (isHeld("KeyA", "ArrowLeft")) dirX -= 1;
  if (isHeld("KeyD", "ArrowRight")) dirX += 1;
  if (isHeld("KeyW", "ArrowUp")) dirY -= 1;
  if (isHeld("KeyS", "ArrowDown")) dirY += 1;

  // 2. Diagonals: pressing two keys would make the direction (1, 1),
  //    which is about 1.41 long — 41% faster! Shrink it back to length 1.
  if (dirX !== 0 && dirY !== 0) {
    dirX *= Math.SQRT1_2; // about 0.707
    dirY *= Math.SQRT1_2;
  }

  // 3. Move: distance = speed x time.
  const oldX = player.x;
  const oldY = player.y;
  player.x += dirX * SETTINGS.playerSpeed * seconds;
  player.y += dirY * SETTINGS.playerSpeed * seconds;

  // 4. Keep the player inside the sidelines.
  player.x = clamp(player.x, field.left, field.right - player.width);
  player.y = clamp(player.y, field.top, field.bottom - player.height);

  // 5. For the running animation: how far did we ACTUALLY move?
  //    (Pushing into a sideline doesn't count as running.)
  const moved = Math.hypot(player.x - oldX, player.y - oldY);
  player.moving = moved > 0.01;
  player.stride += moved;
}

function moveDefenders(seconds) {
  // Who are the defenders chasing? The decoy if there is one, otherwise you.
  const target = game.decoy || player;

  for (const defender of game.defenders) {
    // Arrow from the defender to its target.
    const towardX = target.x - defender.x;
    const towardY = target.y - defender.y;
    const distance = Math.hypot(towardX, towardY);
    defender.moving = distance >= 1;
    if (!defender.moving) continue; // already on top of the target

    // Divide by the distance to get a direction of length 1,
    // then move along it at the defender's speed.
    const step = Math.min(defender.speed * seconds, distance);
    defender.x += (towardX / distance) * step;
    defender.y += (towardY / distance) * step;
    defender.stride += step;
  }
}

// Defenders push away from each other so they never stack into one blob.
// We check every PAIR of defenders. If two are closer than their
// personal space, each one steps back half of the overlap.
function spreadOutDefenders() {
  const space = SETTINGS.defenderPersonalSpace;
  const list = game.defenders;

  // Pushing one pair apart can bump into a third defender, so we
  // repeat the whole check a few times each frame to settle the crowd.
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pushApart(list[i], list[j], space);
      }
    }
  }

  // Pushing might shove someone off the field, so keep everyone inside.
  for (const d of list) {
    d.x = clamp(d.x, field.left, field.right - d.width);
    d.y = clamp(d.y, field.top, field.bottom - d.height);
  }
}

// If `a` and `b` are closer than `space`, each steps back half the overlap.
function pushApart(a, b, space) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let distance = Math.hypot(dx, dy);
  if (distance >= space) return; // far enough apart already

  if (distance < 0.01) {
    // Exactly on top of each other: pick a random direction to split.
    const angle = Math.random() * Math.PI * 2;
    dx = Math.cos(angle);
    dy = Math.sin(angle);
    distance = 1;
  }

  const push = (space - distance) / 2;  // each one moves half
  const pushX = (dx / distance) * push;
  const pushY = (dy / distance) * push;
  a.x -= pushX;
  a.y -= pushY;
  b.x += pushX;
  b.y += pushY;
}

// Keep `value` between `min` and `max`.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


// ---------------------------------------------------------------------
//  EFFECTS — feedback that helps you FEEL what just happened.
// ---------------------------------------------------------------------

// Throw a handful of little pixels out from a point.
function burst(x, y, colors, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.5 + Math.random());
    const life = 0.4 + Math.random() * 0.3;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life,
      maxLife: life,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function celebrateTrophy(trophy) {
  const centerX = trophy.x + trophy.width / 2;
  const centerY = trophy.y + trophy.height / 2;
  burst(centerX, centerY, ["#ffd23f", "#fff8d6", "#ffffff"], SETTINGS.sparkleCount, 70);
  game.popups.push({ x: centerX, y: trophy.y, text: `+${SETTINGS.trophyPoints}`, life: 0.8 });
}

function tackleFeedback() {
  game.shakeLeft = SETTINGS.shakeSeconds;
  game.flashLeft = 0.3;
  burst(player.x + player.width / 2, player.y + player.height, ["#f4f0d9", "#a8d5a2"], 10, 50);
}

function updateEffects(seconds) {
  game.shakeLeft = Math.max(0, game.shakeLeft - seconds);
  game.flashLeft = Math.max(0, game.flashLeft - seconds);
  game.goLeft = Math.max(0, game.goLeft - seconds);

  for (const p of game.particles) {
    p.x += p.vx * seconds;
    p.y += p.vy * seconds;
    p.vy += 120 * seconds; // a little gravity so sparkles fall
    p.life -= seconds;
  }
  // Keep only the particles that are still alive.
  game.particles = game.particles.filter((p) => p.life > 0);

  for (const popup of game.popups) {
    popup.y -= 25 * seconds; // float upward
    popup.life -= seconds;
  }
  game.popups = game.popups.filter((popup) => popup.life > 0);
}


// ---------------------------------------------------------------------
//  DRAW — paint the whole picture from scratch every frame.
// ---------------------------------------------------------------------
function draw() {
  // Screen shake: nudge EVERYTHING by a small random amount.
  // ctx.save() remembers the normal position; ctx.restore() goes back.
  ctx.save();
  if (game.shakeLeft > 0) {
    const strength = SETTINGS.shakeStrength * (game.shakeLeft / SETTINGS.shakeSeconds);
    ctx.translate(
      Math.round((Math.random() * 2 - 1) * strength),
      Math.round((Math.random() * 2 - 1) * strength)
    );
  }

  drawField();

  // The trophy gently bobs up and down.
  const bob = Math.round(Math.sin(game.clock * 4) * 2);
  drawSprite(TROPHY_SPRITE, TROPHY_COLORS, game.trophy.x, game.trophy.y + bob);

  // The decoy looks exactly like you — that's the whole trick!
  if (game.decoy) {
    drawSprite(PLAYER_SPRITE, PLAYER_COLORS, game.decoy.x, game.decoy.y);
  }

  for (const defender of game.defenders) {
    drawRunner(defender, DEFENDER_COLORS);
  }

  if (isCloaked()) {
    // Cloaked: draw you see-through. In the last half second, blink
    // as a warning that the cloak is about to wear off.
    const endingSoon = game.cloakLeft < 0.5 && Math.floor(game.clock * 10) % 2 === 0;
    ctx.globalAlpha = endingSoon ? 0.7 : 0.3; // 0 = invisible, 1 = solid
    drawRunner(player, PLAYER_COLORS);
    ctx.globalAlpha = 1; // put it back so nothing else is see-through
  } else {
    // While you're in your grace period, flicker on and off.
    const flickerOff = game.graceLeft > 0 && Math.floor(game.clock * 12) % 2 === 0;
    if (!flickerOff) {
      drawRunner(player, PLAYER_COLORS);
    }
  }

  drawParticles();
  drawPopups();
  ctx.restore(); // end of the shaking part

  // Red flash over the whole field when you're tackled (fades out).
  if (game.flashLeft > 0) {
    ctx.globalAlpha = (game.flashLeft / 0.3) * 0.4;
    ctx.fillStyle = COLORS.tackleFlash;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  drawCountdown();
  updateHud();
}

function drawField() {
  // Mowed-grass stripes. (Drawn a little past the edges so the
  // screen shake never shows a gap.)
  const stripeWidth = 20;
  for (let x = -stripeWidth; x < canvas.width + stripeWidth; x += stripeWidth) {
    const isEven = Math.abs(x / stripeWidth) % 2 === 0;
    ctx.fillStyle = isEven ? COLORS.grassLight : COLORS.grassDark;
    ctx.fillRect(x, -10, stripeWidth, canvas.height + 20);
  }

  // White field lines (2 pixels thick).
  ctx.strokeStyle = COLORS.lines;
  ctx.lineWidth = 2;

  // Sideline / boundary.
  ctx.strokeRect(
    field.left, field.top,
    field.right - field.left, field.bottom - field.top
  );

  // Halfway line.
  const middleX = canvas.width / 2;
  ctx.beginPath();
  ctx.moveTo(middleX, field.top);
  ctx.lineTo(middleX, field.bottom);
  ctx.stroke();

  // Center circle.
  ctx.beginPath();
  ctx.arc(middleX, canvas.height / 2, 30, 0, Math.PI * 2);
  ctx.stroke();
}

// Draw the player or a defender, picking the right animation frame.
function drawRunner(runner, colors) {
  if (!runner.moving) {
    drawSprite(PLAYER_SPRITE, colors, runner.x, runner.y);
    return;
  }
  // Every `stepLength` pixels of running, switch to the other frame.
  const step = Math.floor(runner.stride / SETTINGS.stepLength);
  const isFrameA = step % 2 === 0;
  // On frame B the body bobs up 1 pixel, like a real running bounce.
  const bounce = isFrameA ? 0 : -1;
  drawSprite(isFrameA ? RUN_FRAME_A : RUN_FRAME_B, colors, runner.x, runner.y + bounce);
}

// Draw any letter-sprite at (x, y) using the given colors.
function drawSprite(sprite, colors, x, y) {
  // Round to whole pixels so the sprite stays crisp.
  const left = Math.round(x);
  const top = Math.round(y);
  const size = SETTINGS.pixelSize;
  const width = spriteWidth(sprite);
  const height = spriteHeight(sprite);

  // A little shadow underneath.
  ctx.fillStyle = COLORS.shadow;
  ctx.fillRect(left + 2, top + height - 2, width - 4, 3);

  // Go through the sprite row by row, letter by letter.
  sprite.forEach((row, rowIndex) => {
    [...row].forEach((letter, columnIndex) => {
      if (letter === ".") return; // empty pixel
      ctx.fillStyle = colors[letter];
      ctx.fillRect(left + columnIndex * size, top + rowIndex * size, size, size);
    });
  });
}

function drawParticles() {
  for (const p of game.particles) {
    ctx.globalAlpha = p.life / p.maxLife; // fade out as they die
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawPopups() {
  for (const popup of game.popups) {
    ctx.globalAlpha = Math.min(1, popup.life / 0.3);
    drawText(popup.text, popup.x, popup.y, 12);
  }
  ctx.globalAlpha = 1;
}

function drawCountdown() {
  if (game.state === "countdown") {
    const number = Math.ceil(game.countdownLeft);
    // Each number starts big and shrinks — a little "punch".
    const fraction = game.countdownLeft - Math.floor(game.countdownLeft);
    const size = 40 + Math.round(fraction * 24);
    drawText(String(number), canvas.width / 2, canvas.height / 2, size);
  } else if (game.goLeft > 0) {
    ctx.globalAlpha = Math.min(1, game.goLeft / 0.3);
    drawText("GO!", canvas.width / 2, canvas.height / 2, 48);
    ctx.globalAlpha = 1;
  }
}

// Chunky outlined arcade text, centered on (x, y).
function drawText(text, x, y, size) {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(3, size / 8);
  ctx.strokeStyle = COLORS.textOutline;
  ctx.strokeText(text, Math.round(x), Math.round(y));
  ctx.fillStyle = COLORS.text;
  ctx.fillText(text, Math.round(x), Math.round(y));
}

function updateHud() {
  scoreText.textContent = game.score;
  bestText.textContent = game.best;
  timerText.textContent = Math.ceil(game.timeLeft);
  const lost = SETTINGS.startingHearts - game.hearts;
  heartsText.textContent = "♥".repeat(game.hearts) + "♡".repeat(lost);

  // Cloak meter: full when ready, drains while active, refills while recharging.
  let fullness;
  let status;
  if (isCloaked()) {
    fullness = game.cloakLeft / SETTINGS.cloakSeconds;
    status = "active";
  } else if (game.cloakRecharge > 0) {
    fullness = 1 - game.cloakRecharge / SETTINGS.cloakRechargeSeconds;
    status = "recharging";
  } else {
    fullness = 1;
    status = "ready";
  }
  cloakFill.style.width = `${fullness * 100}%`;
  cloakFill.className = status;           // style.css colors each status
  cloakLabel.textContent = status.toUpperCase();
}


// ---------------------------------------------------------------------
//  GAME LOOP — the heartbeat. Runs about 60 times per second:
//  measure time  ->  update the world  ->  draw it  ->  repeat.
//  There is only ever ONE loop. Restarting just resets the game state.
// ---------------------------------------------------------------------
let lastTime = performance.now();

function gameLoop(now) {
  // How many seconds since the last frame? Capped so that switching
  // tabs and coming back doesn't teleport anyone.
  const seconds = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  update(seconds);
  draw();

  requestAnimationFrame(gameLoop); // ask the browser for the next frame
}

// Set up the field behind the start screen, then begin the loop.
resetRound();
overlayMessage.textContent =
  "Grab trophies. Dodge the red defenders. Press SPACE to CLOAK: " +
  "leave a decoy and walk through defenders unseen. Last 60 seconds to win!";
requestAnimationFrame(gameLoop);
