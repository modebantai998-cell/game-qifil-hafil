// Shared game rules: account helpers, levels, physics. Pure so it can be tested.
export const usernameToEmail = (u: string) =>
  `${u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@qifilhafil.app`;
export const isValidUsername = (u: string) => /^[a-zA-Z0-9._-]{3,20}$/.test(u.trim());

export const W = 1280;
export const H = 720;
export const PW = 40;
export const PH = 40;
export const GRAVITY = 0.7;
export const JUMP = -13;
export const SPEED = 5;

export type Rect = { x: number; y: number; w: number; h: number };
export type Level = {
  platforms: Rect[];
  button: { x: number; y: number };
  key: { x: number; y: number };
  door: { x: number; y: number };
  spawn: [number, number];
};

const ground: Rect = { x: 0, y: 640, w: W, h: 80 };

// Every step is at most 90px above the one below (jump reaches ~120px), so both players can climb alone.
export const LEVELS: Level[] = [
  {
    platforms: [ground, { x: 600, y: 560, w: 680, h: 80 }, { x: 860, y: 470, w: 120, h: 24 }],
    button: { x: 330, y: 640 },
    key: { x: 905, y: 420 },
    door: { x: 1180, y: 480 },
    spawn: [80, 140],
  },
  {
    platforms: [ground, { x: 380, y: 560, w: 420, h: 80 }, { x: 800, y: 470, w: 480, h: 170 }],
    button: { x: 600, y: 560 },
    key: { x: 1000, y: 410 },
    door: { x: 1180, y: 390 },
    spawn: [80, 140],
  },
  {
    platforms: [ground, { x: 250, y: 560, w: 160, h: 80 }, { x: 560, y: 470, w: 160, h: 24 }, { x: 860, y: 380, w: 420, h: 260 }],
    button: { x: 120, y: 640 },
    key: { x: 620, y: 420 },
    door: { x: 1180, y: 300 },
    spawn: [60, 160],
  },
];

export const levelAt = (n: number): Level => LEVELS[(n - 1) % LEVELS.length]!;

export type Body = { x: number; y: number; vx: number; vy: number; onGround: boolean };
export type Input = { left: boolean; right: boolean; up: boolean; down: boolean };

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Advance one frame. `solids` includes platforms and the partner's body. */
export function step(b: Body, input: Input, solids: Rect[]): Body {
  let { x, y, vx, vy } = b;
  vx = input.left ? -SPEED : input.right ? SPEED : vx * 0.7;
  if (Math.abs(vx) < 0.1) vx = 0;
  if (input.up && b.onGround) vy = JUMP;
  vy += GRAVITY + (input.down ? 0.6 : 0);
  if (vy > 18) vy = 18;

  x += vx;
  for (const s of solids) {
    const r = { x, y, w: PW, h: PH };
    if (overlap(r, s)) x = vx > 0 ? s.x - PW : vx < 0 ? s.x + s.w : x;
  }
  x = Math.max(0, Math.min(W - PW, x));

  y += vy;
  let onGround = false;
  for (const s of solids) {
    const r = { x, y, w: PW, h: PH };
    if (overlap(r, s)) {
      if (vy > 0) { y = s.y - PH; onGround = true; } else if (vy < 0) y = s.y + s.h;
      vy = 0;
    }
  }
  if (y > H) { y = 0; vy = 0; }
  return { x, y, vx, vy, onGround };
}

export const touches = (b: { x: number; y: number }, px: number, py: number, dist = 40) =>
  Math.abs(b.x + PW / 2 - px) < dist && Math.abs(b.y + PH / 2 - py) < dist + 10;
