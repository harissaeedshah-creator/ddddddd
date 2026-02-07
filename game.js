const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");
const powerEl = document.getElementById("power");
const overlay = document.getElementById("overlay");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start");

const world = {
  width: 320,
  height: 180,
  tile: 10,
};

const state = {
  running: false,
  score: 0,
  wave: 1,
  lives: 3,
  power: 0,
  powerMode: 0,
  dashCharge: 0,
  pellets: [],
  enemies: [],
  projectiles: [],
  particles: [],
  lastSpawn: 0,
  lastFrame: 0,
  slowMo: 0,
  messageTimer: 0,
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
  dash: false,
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  vx: 0,
  vy: 0,
  speed: 0.9,
  size: 6,
  invuln: 0,
};

const palette = {
  bg: "#06070f",
  grid: "#101428",
  neon: "#51f6ff",
  pink: "#ff4fd8",
  yellow: "#ffd64d",
  purple: "#7b5cff",
  white: "#f4f7ff",
};

const keys = new Map([
  ["KeyW", "up"],
  ["ArrowUp", "up"],
  ["KeyS", "down"],
  ["ArrowDown", "down"],
  ["KeyA", "left"],
  ["ArrowLeft", "left"],
  ["KeyD", "right"],
  ["ArrowRight", "right"],
  ["Space", "fire"],
  ["ShiftLeft", "dash"],
  ["ShiftRight", "dash"],
]);

function resetGame() {
  state.running = true;
  state.score = 0;
  state.wave = 1;
  state.lives = 3;
  state.power = 0;
  state.powerMode = 0;
  state.dashCharge = 0;
  state.pellets = [];
  state.enemies = [];
  state.projectiles = [];
  state.particles = [];
  state.lastSpawn = 0;
  state.messageTimer = 0;
  player.x = world.width / 2;
  player.y = world.height / 2;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 0;
  spawnPellets();
  spawnWave();
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score.toString();
  waveEl.textContent = state.wave.toString();
  livesEl.textContent = state.lives.toString();
  powerEl.textContent = `${Math.min(100, Math.floor(state.power))}%`;
}

function spawnPellets() {
  const count = 40 + state.wave * 4;
  state.pellets = Array.from({ length: count }, (_, i) => ({
    x: (i * 17 + 13) % (world.width - 20) + 10,
    y: (i * 29 + 9) % (world.height - 20) + 10,
    size: i % 9 === 0 ? 3 : 2,
    power: i % 9 === 0,
  }));
}

function spawnWave() {
  const count = Math.min(8 + state.wave * 2, 24);
  for (let i = 0; i < count; i += 1) {
    const edge = i % 4;
    const enemy = {
      x: edge === 0 ? -8 : edge === 1 ? world.width + 8 : Math.random() * world.width,
      y: edge === 2 ? -8 : edge === 3 ? world.height + 8 : Math.random() * world.height,
      vx: 0,
      vy: 0,
      speed: 0.3 + state.wave * 0.03,
      size: 6,
      hue: i % 3,
      stun: 0,
    };
    state.enemies.push(enemy);
  }
}

function spawnParticle(x, y, color, count = 6) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      life: 30 + Math.random() * 20,
      color,
    });
  }
}

function shoot() {
  const speed = 2.2;
  const dirX = input.left ? -1 : input.right ? 1 : 0;
  const dirY = input.up ? -1 : input.down ? 1 : 0;
  const magnitude = Math.hypot(dirX, dirY) || 1;
  state.projectiles.push({
    x: player.x,
    y: player.y,
    vx: (dirX / magnitude) * speed,
    vy: (dirY / magnitude) * speed,
    life: 60,
  });
}

function activateDash() {
  if (state.dashCharge < 100) return;
  state.dashCharge = 0;
  player.invuln = 20;
  player.vx *= 4;
  player.vy *= 4;
  spawnParticle(player.x, player.y, palette.pink, 16);
}

function update(delta) {
  const speed = player.speed + (state.powerMode > 0 ? 0.2 : 0);
  player.vx += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * speed * delta;
  player.vy += ((input.down ? 1 : 0) - (input.up ? 1 : 0)) * speed * delta;
  player.vx *= 0.8;
  player.vy *= 0.8;

  player.x = Math.max(8, Math.min(world.width - 8, player.x + player.vx));
  player.y = Math.max(8, Math.min(world.height - 8, player.y + player.vy));

  if (input.fire && state.projectiles.length < 4) {
    input.fire = false;
    shoot();
  }

  if (input.dash) {
    input.dash = false;
    activateDash();
  }

  if (player.invuln > 0) player.invuln -= 1;
  if (state.powerMode > 0) state.powerMode -= 1;
  state.slowMo = state.powerMode > 0 ? 0.6 : 1;

  state.projectiles = state.projectiles.filter((shot) => {
    shot.x += shot.vx;
    shot.y += shot.vy;
    shot.life -= 1;
    return shot.life > 0;
  });

  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
    return particle.life > 0;
  });

  state.enemies.forEach((enemy) => {
    if (enemy.stun > 0) {
      enemy.stun -= 1;
      return;
    }
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    enemy.vx = (dx / dist) * enemy.speed * delta * state.slowMo;
    enemy.vy = (dy / dist) * enemy.speed * delta * state.slowMo;
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
  });

  state.enemies = state.enemies.filter((enemy) => {
    const hit = state.projectiles.find((shot) => {
      const dist = Math.hypot(shot.x - enemy.x, shot.y - enemy.y);
      return dist < enemy.size;
    });
    if (hit) {
      hit.life = 0;
      spawnParticle(enemy.x, enemy.y, palette.neon);
      state.score += 120;
      state.power = Math.min(100, state.power + 8);
      state.dashCharge = Math.min(100, state.dashCharge + 12);
      updateHud();
      return false;
    }
    return true;
  });

  state.pellets = state.pellets.filter((pellet) => {
    const dist = Math.hypot(player.x - pellet.x, player.y - pellet.y);
    if (dist < player.size + pellet.size) {
      state.score += pellet.power ? 250 : 80;
      state.power = Math.min(100, state.power + (pellet.power ? 25 : 10));
      state.dashCharge = Math.min(100, state.dashCharge + 8);
      if (pellet.power) {
        state.powerMode = 240;
        spawnParticle(pellet.x, pellet.y, palette.yellow, 12);
      }
      updateHud();
      return false;
    }
    return true;
  });

  if (state.power >= 100) {
    state.power = 100;
  }

  if (state.pellets.length === 0 || state.enemies.length === 0) {
    state.wave += 1;
    spawnPellets();
    spawnWave();
    updateHud();
  }

  state.enemies.forEach((enemy) => {
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < player.size + enemy.size && player.invuln === 0) {
      state.lives -= 1;
      player.invuln = 60;
      spawnParticle(player.x, player.y, palette.pink, 20);
      updateHud();
    }
  });

  if (state.lives <= 0) {
    state.running = false;
    statusEl.textContent = "Game Over";
    overlay.classList.remove("hidden");
  }
}

function drawGrid() {
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < world.width; x += world.tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += world.tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function draw() {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, world.width, world.height);

  drawGrid();

  state.pellets.forEach((pellet) => {
    ctx.fillStyle = pellet.power ? palette.yellow : palette.white;
    ctx.fillRect(pellet.x - pellet.size / 2, pellet.y - pellet.size / 2, pellet.size, pellet.size);
  });

  state.projectiles.forEach((shot) => {
    ctx.fillStyle = palette.neon;
    ctx.fillRect(shot.x - 1, shot.y - 1, 2, 2);
  });

  state.enemies.forEach((enemy) => {
    ctx.fillStyle = enemy.hue === 0 ? palette.pink : enemy.hue === 1 ? palette.purple : palette.neon;
    ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(enemy.x - 1, enemy.y - 1, 2, 2);
  });

  state.particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 1.5, 1.5);
  });

  ctx.fillStyle = player.invuln > 0 ? palette.yellow : palette.neon;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.bg;
  ctx.fillRect(player.x + 2, player.y - 1, 3, 2);
}

function loop(timestamp) {
  const delta = (timestamp - state.lastFrame) / 16.67 || 1;
  state.lastFrame = timestamp;

  if (state.running) {
    update(delta);
  }

  ctx.save();
  ctx.scale(canvas.width / world.width, canvas.height / world.height);
  draw();
  ctx.restore();

  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = keys.get(event.code);
  if (key) {
    input[key] = true;
    if (event.code === "Space") event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  const key = keys.get(event.code);
  if (key) input[key] = false;
});

startBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  statusEl.textContent = "Insert Coin";
  resetGame();
});

requestAnimationFrame(loop);
