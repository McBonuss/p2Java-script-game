// --- Constants ---
const GORILLA_BODY_CENTER_Y = 50;    // Y offset for the gorilla's body center (from feet)
const GORILLA_BODY_RADIUS = 50;      // Radius of the gorilla's body hitbox
const BOMB_RADIUS = 10;              // Radius of the bomb

let stars = [];

// --- State ---
let state = {};

// --- DOM References ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const angle1DOM = document.querySelector("#info-left .angle");
const velocity1DOM = document.querySelector("#info-left .velocity");
const angle2DOM = document.querySelector("#info-right .angle");
const velocity2DOM = document.querySelector("#info-right .velocity");
const bombGrabAreaDOM = document.getElementById("bomb-grab-area");
const congratulationsDOM = document.getElementById("congratulations");
const winnerDOM = document.getElementById("winner");
const newGameButtonDOM = document.getElementById("new-game");

canvas.style.touchAction = "none";

// --- Initialization ---
newGameButtonDOM.addEventListener("click", newGame);
window.addEventListener("resize", resizeCanvasToContainer);
window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
document.addEventListener("DOMContentLoaded", () => {
  newGame();
  resizeCanvasToContainer();
  checkOrientation();
});

// --- New Game ---
function newGame() {
  state = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    phase: "aiming",
    currentPlayer: 1,
    bomb: { x: 0, y: 0, velocity: { x: 0, y: 0 } },
    buildings: generateBuildings(),
  };
  generateStars();
  calculateScale();
  initializeBombPosition();
  hideCongrats();
  resetInfoDisplays();
  draw();
}

// --- Utility ---
function getGorillaBuilding(player) {
  // Player 1 on second building, Player 2 on seventh (one to the right)
  const idx = player === 1 ? 1 : state.buildings.length - 2;
  return state.buildings[idx];
}

function getGorillaOrigin(player) {
  const b = getGorillaBuilding(player);
  return { x: b.x + b.width / 2, y: b.y + b.height };
}

// --- Drawing ---

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawBuildings();
  drawGorilla(1);
  drawGorilla(2);
  drawBomb();
  drawTrajectoryDots();
}

function drawBackground() {
  // Night sky gradient
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a174a");
  gradient.addColorStop(1, "#24365a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stars (static)
  for (let i = 0; i < stars.length; i++) {
    let sx = stars[i].x * canvas.width;
    let sy = stars[i].y * canvas.height;
    let r = stars[i].r;
    ctx.save();
    ctx.globalAlpha = stars[i].alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
  }

  // Draw moon (with a little shadow)
  let moonX = canvas.width - 120;
  let moonY = 100;
  let moonRadius = 38;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#eae8e0";
  ctx.shadowColor = "#eee";
  ctx.shadowBlur = 35;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  // Draw subtle craters
  ctx.beginPath();
  ctx.arc(moonX + 13, moonY - 8, 6, 0, 2 * Math.PI);
  ctx.arc(moonX - 17, moonY + 12, 4, 0, 2 * Math.PI);
  ctx.arc(moonX + 5, moonY + 16, 2.5, 0, 2 * Math.PI);
  ctx.arc(moonX - 9, moonY - 13, 2, 0, 2 * Math.PI);
  ctx.fillStyle = "#d4d2c3";
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.restore();
}

function drawBuildings() {
  state.buildings.forEach((b, i) => {
    // Main building colour (darker)
    const shade = 16 + i * 10;
    ctx.fillStyle = `rgb(${20 + shade},${36 + shade},${56 + shade})`;
    ctx.fillRect(
      b.x * state.scale + state.offsetX,
      canvas.height - (b.height * state.scale + state.offsetY),
      b.width * state.scale,
      b.height * state.scale
    );

    // "3D" highlight (left edge)
    ctx.fillStyle = `rgba(255,255,255,0.10)`;
    ctx.fillRect(
      b.x * state.scale + state.offsetX,
      canvas.height - (b.height * state.scale + state.offsetY),
      8,
      b.height * state.scale
    );

    // --- Draw static windows ---
    const winRows = Math.floor(b.height / 28);
    const winCols = Math.floor(b.width / 20);
    b.windows.forEach(win => {
      ctx.fillStyle = win.color;
      ctx.fillRect(
        b.x * state.scale + state.offsetX + 8 + win.col * 14,
        canvas.height - (b.height * state.scale + state.offsetY) + 8 + win.row * 18,
        8,
        8
      );
    });

    // Simple antenna for a few buildings
    if (i % 4 === 0) {
      ctx.beginPath();
      ctx.moveTo(
        (b.x + b.width / 2) * state.scale + state.offsetX,
        canvas.height - (b.height * state.scale + state.offsetY)
      );
      ctx.lineTo(
        (b.x + b.width / 2) * state.scale + state.offsetX,
        canvas.height - (b.height * state.scale + state.offsetY) - 16
      );
      ctx.strokeStyle = '#bbbbbb';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

function drawGorilla(player) {
  ctx.save();
  const { x, y } = getGorillaOrigin(player);
  const cx = x * state.scale + state.offsetX;
  const cy = canvas.height - (y * state.scale + state.offsetY);
  // Shift gorilla up so feet are on the building
  const gorillaFootOffset = 9 * state.scale;
  ctx.translate(cx, cy - gorillaFootOffset);
  drawGorillaBody();
  drawGorillaLeftArm(player);
  drawGorillaRightArm(player);
  drawGorillaFace();
  ctx.restore();
}

function drawGorillaBody() {
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(0, -20 * state.scale);
  ctx.lineTo(-12 * state.scale, 0);
  ctx.lineTo(-22 * state.scale, 10 * state.scale);
  ctx.lineTo(-18 * state.scale, -70 * state.scale);
  ctx.lineTo(0, -95 * state.scale);
  ctx.lineTo(18 * state.scale, -70 * state.scale);
  ctx.lineTo(22 * state.scale, 10 * state.scale);
  ctx.lineTo(12 * state.scale, 0);
  ctx.closePath();
  ctx.fill();
}

function drawGorillaLeftArm(player) {
  // Left arm is up only if Player 1 is aiming or if celebrating and this player won
  const raising =
    (state.phase === 'aiming' && state.currentPlayer === 1 && player === 1) ||
    (state.phase === 'celebrating' && state.currentPlayer === player);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 18 * state.scale;
  ctx.beginPath();
  ctx.moveTo(-13 * state.scale, -50 * state.scale);
  ctx.quadraticCurveTo(
    -44 * state.scale,
    -(raising ? 63 : 45) * state.scale,
    -28 * state.scale,
    -(raising ? 107 : 12) * state.scale
  );
  ctx.stroke();
}

function drawGorillaRightArm(player) {
  // Right arm is up only if Player 2 is aiming or if celebrating and this player won
  const raising =
    (state.phase === 'aiming' && state.currentPlayer === 2 && player === 2) ||
    (state.phase === 'celebrating' && state.currentPlayer === player);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 18 * state.scale;
  ctx.beginPath();
  ctx.moveTo(13 * state.scale, -50 * state.scale);
  ctx.quadraticCurveTo(
    44 * state.scale,
    -(raising ? 63 : 45) * state.scale,
    28 * state.scale,
    -(raising ? 107 : 12) * state.scale
  );
  ctx.stroke();
}

function drawGorillaFace() {
  // Face circle with reduced angle (tilted less)
  ctx.save();
  ctx.beginPath();
  // Move the face slightly higher and more upright by adjusting the y offset and reducing the tilt
  ctx.arc(0, -74 * state.scale, 15 * state.scale, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 3 * state.scale;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Eyes (move up with the face)
  ctx.beginPath();
  ctx.arc(-5 * state.scale, -78 * state.scale, 2.5 * state.scale, 0, 2 * Math.PI);
  ctx.arc(5 * state.scale, -78 * state.scale, 2.5 * state.scale, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Smile (move up with the face)
  ctx.beginPath();
  ctx.arc(0, -71 * state.scale, 6 * state.scale, 0, Math.PI, false);
  ctx.lineWidth = 2 * state.scale;
  ctx.strokeStyle = 'white';
  ctx.stroke();
  ctx.restore();
}

function drawBomb() {
  ctx.save();
  const bx = state.bomb.x * state.scale + state.offsetX;
  const by = canvas.height - (state.bomb.y * state.scale + state.offsetY);

  // Bomb body
  ctx.beginPath();
  ctx.arc(bx, by, BOMB_RADIUS * state.scale, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#ffe674';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Fuse (wiggle it with time!)
  ctx.save();
  ctx.strokeStyle = '#9c6f28';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + 9 * state.scale, by - 8 * state.scale);
  let fuseEndX = bx + 18 * state.scale + 2 * Math.sin(Date.now() / 80);
  let fuseEndY = by - 17 * state.scale + 2 * Math.cos(Date.now() / 80);
  ctx.lineTo(fuseEndX, fuseEndY);
  ctx.stroke();
  ctx.restore();

  // Spark at end of fuse
  ctx.save();
  ctx.beginPath();
  ctx.arc(fuseEndX, fuseEndY, 3.5 * state.scale, 0, 2 * Math.PI);
  ctx.fillStyle = 'orange';
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 80);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawTrajectoryDots() {
  if (state.phase !== 'aiming') return;
  const steps = 5;
  const dt = 0.08;
  let { x, y } = state.bomb;
  let vx = state.bomb.velocity.x;
  let vy = state.bomb.velocity.y;
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < steps; i++) {
    vx = vx;
    vy = vy - 20 * dt;
    x = x + vx * dt;
    y = y + vy * dt;
    const px = x * state.scale + state.offsetX;
    const py = canvas.height - (y * state.scale + state.offsetY);
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.fill();
  }
  ctx.restore();
}

// --- Layout & Scaling ---
function calculateScale() {
  const last = state.buildings[state.buildings.length - 1];
  const totalW = last.x + last.width;
  const maxH = Math.max(...state.buildings.map(b => b.height));
  state.scale = Math.min(canvas.width / totalW, canvas.height / (maxH + 200));
  state.offsetX = (canvas.width - totalW * state.scale) / 2;
  state.offsetY = 0;
}

function generateBuildings() {
  const arr = [];
  for (let i = 0; i < 9; i++) {
    const prev = arr[i - 1];
    const x = prev ? prev.x + prev.width + 4 : 0;
    const w = 80 + Math.random() * 40;
    const plat = (i === 1 || i === 6);
    const h = plat ? 30 + Math.random() * 120 : 40 + Math.random() * 260;

    // --- Generate static windows for this building ---
    const winRows = Math.floor(h / 28);
    const winCols = Math.floor(w / 20);
    const windows = [];
    for (let row = 0; row < winRows; row++) {
      for (let col = 0; col < winCols; col++) {
        if ((col > 0 && col < winCols - 1) && Math.random() < 0.7) {
          windows.push({
            row,
            col,
            color: Math.random() < 0.85 ? '#fff9a0' : '#bbe8fa'
          });
        }
      }
    }

    arr.push({ x, y: 0, width: w, height: h, windows });
  }
  return arr;
}

// --- Bomb & Grab Area Setup ---
function initializeBombPosition() {
  const b = getGorillaBuilding(state.currentPlayer);
  const offset = state.currentPlayer === 1 ? -28 : 28;
  state.bomb.x = b.x + b.width / 2 + offset;
  state.bomb.y = b.y + b.height + 107;
  state.bomb.velocity = { x: 0, y: 0 };
  updateBombGrabArea();
}

function updateBombGrabArea() {
  const r = 80 * state.scale;
  const b = getGorillaBuilding(state.currentPlayer);
  const cx = (b.x + b.width / 2) * state.scale + state.offsetX;
  const cy = canvas.height - ((b.y + b.height + GORILLA_BODY_CENTER_Y) * state.scale + state.offsetY);
  bombGrabAreaDOM.style.left = `${cx - r}px`;
  bombGrabAreaDOM.style.top = `${cy - r}px`;
  bombGrabAreaDOM.style.width = `${r * 2}px`;
  bombGrabAreaDOM.style.height = `${r * 2}px`;
}

// --- Input Handling ---
let isDragging = false, startX, startY;

bombGrabAreaDOM.addEventListener('mousedown', e => {
  if (state.phase === 'aiming') {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    document.body.style.cursor = 'grabbing';
  }
});

window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = (e.clientX - startX) / state.scale;
  const dy = (startY - e.clientY) / state.scale;
  state.bomb.velocity.x = -dx;
  state.bomb.velocity.y = -dy;
  updateInfo(dx, dy);
  updateBombGrabArea();
  draw();
});

window.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  document.body.style.cursor = 'default';
  throwBomb();
});

// Touch start
bombGrabAreaDOM.addEventListener('touchstart', function(e) {
  if (state.phase === 'aiming') {
    isDragging = true;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  }
}, { passive: false });

// Touch move
window.addEventListener('touchmove', function(e) {
  if (!isDragging) return;
  const touch = e.touches[0];
  const dx = (touch.clientX - startX) / state.scale;
  const dy = (startY - touch.clientY) / state.scale;
  state.bomb.velocity.x = -dx;
  state.bomb.velocity.y = -dy;
  updateInfo(dx, dy);
  updateBombGrabArea();
  draw();
  e.preventDefault();
}, { passive: false });

// Touch end
window.addEventListener('touchend', function(e) {
  if (!isDragging) return;
  isDragging = false;
  document.body.style.cursor = 'default';
  throwBomb();
  e.preventDefault();
}, { passive: false });

function updateInfo(dx, dy) {
  const speed = Math.hypot(dx, dy);
  const angle = Math.atan2(-dy, dx) * 180 / Math.PI;
  if (state.currentPlayer === 1) {
    angle1DOM.innerText = Math.round(angle);
    velocity1DOM.innerText = Math.round(speed);
  } else {
    angle2DOM.innerText = Math.round(angle);
    velocity2DOM.innerText = Math.round(speed);
  }
}

function resetInfoDisplays() {
  angle1DOM.innerText = 0;
  velocity1DOM.innerText = 0;
  angle2DOM.innerText = 0;
  velocity2DOM.innerText = 0;
}

function hideCongrats() {
  congratulationsDOM.style.visibility = 'hidden';
}

// --- Simulation & Collision ---
let lastTs = null;

function throwBomb() {
  state.phase = 'in flight';
  lastTs = null;
  requestAnimationFrame(animate);
}

function moveBomb(dt) {
  const m = dt / 200;
  state.bomb.velocity.y -= 20 * m;
  state.bomb.x += state.bomb.velocity.x * m;
  state.bomb.y += state.bomb.velocity.y * m;
}

function animate(ts) {
  if (lastTs === null) {
    lastTs = ts;
    requestAnimationFrame(animate);
    return;
  }

  const dt = ts - lastTs;
  const steps = 50;
  const enemy = 3 - state.currentPlayer;

  for (let i = 0; i < steps; i++) {
    moveBomb(dt / steps);

    if (checkFrameHit()) return handleMiss();
    if (checkGorillaHit()) return handleHit();
    if (checkBuildingHit(enemy)) return handleMiss();
  }

  updateBombGrabArea();
  draw();
  lastTs = ts;
  requestAnimationFrame(animate);
}

function handleMiss() {
  state.currentPlayer = 3 - state.currentPlayer;
  state.phase = 'aiming';
  initializeBombPosition();
  draw();
}

function handleHit() {
  state.phase = 'celebrating';
  announceWinner();
  draw();
}

function checkFrameHit() {
  return (
    state.bomb.x < 0 ||
    state.bomb.x > canvas.width / state.scale ||
    state.bomb.y < 0
  );
}

function checkBuildingHit(skipPlayer) {
  const skipB = getGorillaBuilding(skipPlayer);
  return state.buildings.some(b =>
    b !== skipB &&
    state.bomb.x >= b.x && state.bomb.x <= b.x + b.width &&
    state.bomb.y >= b.y && state.bomb.y <= b.y + b.height
  );
}

function checkGorillaHit() {
  const enemy = 3 - state.currentPlayer;
  const { x: ox, y: oy } = getGorillaOrigin(enemy);
  // Compute distance in *game units* (not canvas coords!)
  const dx = state.bomb.x - ox;
  const dy = state.bomb.y - (oy + GORILLA_BODY_CENTER_Y);
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= GORILLA_BODY_RADIUS + BOMB_RADIUS) {
    return true;
  }
  return false;
}

// --- UI Helpers ---
function announceWinner() {
  winnerDOM.innerText = `Player ${state.currentPlayer}`;
  congratulationsDOM.style.visibility = 'visible';
  congratulationsDOM.setAttribute('tabindex', '-1');
  congratulationsDOM.focus();
}

function resizeCanvasToContainer() {
  const container = document.querySelector('.game-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  calculateScale();
  initializeBombPosition();
  draw();
  updateBombGrabArea();
}

function checkOrientation() {
  const msg = document.getElementById('rotate-message');
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  msg.style.display = (isMobile && window.innerWidth < window.innerHeight) ? 'flex' : 'none';
}

function generateStars(count = 80) {
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random() * 0.75,
      r: Math.random() * 1.5 + 0.2,
      alpha: Math.random() * 0.5 + 0.4
    });
  }
}