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
  width: number;
  platforms: Rect[];
  spikes: Rect[];
  pits: { x: number; w: number }[];
  button: { x: number; y: number };
  key: { x: number; y: number };
  door: { x: number; y: number };
  spawn: [number, number];
};

export const MAX_LEVEL = 100;
export const GY = 640; // ground top
export const MAX_STEP = 90; // highest rise between two standing surfaces (jump reaches ~120)
export const MAX_GAP = 160; // widest hole (jump travels ~185)

const rng = (seed: number) => {
  let s = (seed * 9301 + 49297) % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

/** Long level with obstacles that get harder as n grows. Deterministic so both phones build the same map. */
export function makeLevel(n: number): Level {
  const r = rng(n + 7);
  const d = Math.min(1, (n - 1) / (MAX_LEVEL - 1));
  const count = 6 + Math.floor(n * 0.35);
  const kinds = ["step", "wall"];
  if (n >= 3) kinds.push("pit");
  if (n >= 6) kinds.push("spike");
  if (n >= 10) kinds.push("float");
  const platforms: Rect[] = [], spikes: Rect[] = [], pits: { x: number; w: number }[] = [];
  let x = 360, gStart = 0;
  let button = { x: 0, y: GY };
  const endGround = () => platforms.push({ x: gStart, y: GY, w: x - gStart, h: 80 });
  const hole = (w: number) => { endGround(); pits.push({ x, w }); x += w; gStart = x; };
  for (let i = 0; i < count; i++) {
    if (i === Math.floor(count / 2)) { button = { x: x + 60, y: GY }; x += 200; }
    const k = kinds[Math.floor(r() * kinds.length)]!;
    if (k === "step") {
      const h = 40 + Math.round(r() * 50), w = 120 + Math.round(r() * 80);
      platforms.push({ x, y: GY - h, w, h }); x += w + 140;
    } else if (k === "wall") {
      // tall block (up to 150) with a half-height helper step so both characters can climb
      const h = 120 + Math.round(d * 30), w = 60 + Math.round(r() * 60);
      platforms.push({ x, y: GY - h / 2, w: 44, h: h / 2 }, { x: x + 44, y: GY - h, w, h });
      x += 44 + w + 160;
    } else if (k === "pit") {
      hole(Math.min(MAX_GAP, 60 + Math.round(d * 80 + r() * 20))); x += 160;
    } else if (k === "spike") {
      const w = 40 + Math.round(d * 40);
      spikes.push({ x, y: GY - 16, w, h: 16 }); x += w + 160;
    } else {
      const g = Math.min(MAX_GAP, 100 + Math.round(d * 50 + r() * 10));
      hole(g * 2 + 70);
      platforms.push({ x: x - g - 70, y: GY - 40, w: 70, h: 24 });
      x += 160;
    }
  }
  platforms.push({ x: x + 100, y: GY - 90, w: 110, h: 24 });
  const key = { x: x + 140, y: GY - 140 };
  x += 380;
  const door = { x: x, y: GY - 80 };
  x += 240;
  endGround();
  return { width: x, platforms, spikes, pits, button, key, door, spawn: [80, 160] };
}

const cache = new Map<number, Level>();
export const levelAt = (n: number): Level => {
  const k = ((n - 1) % MAX_LEVEL) + 1;
  if (!cache.has(k)) cache.set(k, makeLevel(k));
  return cache.get(k)!;
};

export type Body = { x: number; y: number; vx: number; vy: number; onGround: boolean };
export type Input = { left: boolean; right: boolean; up: boolean; down: boolean };

export const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Advance one frame. `solids` includes platforms and the partner's body. */
export function step(b: Body, input: Input, solids: Rect[], worldW = W): Body {
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
  x = Math.max(0, Math.min(worldW - PW, x));

  y += vy;
  let onGround = false;
  for (const s of solids) {
    const r = { x, y, w: PW, h: PH };
    if (overlap(r, s)) {
      if (vy > 0) { y = s.y - PH; onGround = true; } else if (vy < 0) y = s.y + s.h;
      vy = 0;
    }
  }
  return { x, y, vx, vy, onGround };
}

export const SKINS = {
  merah: { body: "#EF4444", hat: "#B91C1C", label: "Merah" },
  pink: { body: "#FF8FAB", hat: "#E94F86", label: "Pink" },
  biru: { body: "#6BA5FF", hat: "#3B6FD9", label: "Biru" },
  hijau: { body: "#4ADE80", hat: "#15803D", label: "Hijau" },
  kuning: { body: "#FACC15", hat: "#CA8A04", label: "Kuning" },
} as const;
export type Skin = keyof typeof SKINS;
export const isSkin = (s: unknown): s is Skin => typeof s === "string" && s in SKINS;

export const touches = (b: { x: number; y: number }, px: number, py: number, dist = 40) =>
  Math.abs(b.x + PW / 2 - px) < dist && Math.abs(b.y + PH / 2 - py) < dist + 10;
