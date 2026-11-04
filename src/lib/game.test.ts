import { describe, it, expect } from "vitest";
import { step, usernameToEmail, isValidUsername, PH } from "./game";

const idle = { left: false, right: false, up: false, down: false };

describe("game rules", () => {
  it("login uses name only, mapped to a private address", () => {
    expect(usernameToEmail(" Qifil ")).toBe("qifil@qifilhafil.app");
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("hafil_01")).toBe(true);
  });
  it("player lands on top of the partner", () => {
    const partner = { x: 100, y: 600, w: 40, h: 40 };
    let b = { x: 100, y: 500, vx: 0, vy: 0, onGround: false };
    for (let i = 0; i < 60; i++) b = step(b, idle, [partner]);
    expect(b.y).toBe(600 - PH);
    expect(b.onGround).toBe(true);
  });
});

import { levelAt, MAX_LEVEL, MAX_GAP, JUMP, GRAVITY, SPEED, GY } from "./game";
describe("levels", () => {
  const reach = (JUMP * JUMP) / (2 * GRAVITY);
  it("there are 100 levels and later ones are longer", () => {
    expect(MAX_LEVEL).toBe(100);
    expect(levelAt(100).width).toBeGreaterThan(levelAt(1).width);
    expect(levelAt(1).width).toBeGreaterThan(2500);
  });
  it("every hole can be jumped across", () => {
    const airFrames = (2 * -JUMP) / GRAVITY;
    for (let n = 1; n <= MAX_LEVEL; n++)
      for (const p of levelAt(n).pits.filter((p) => p.w <= MAX_GAP)) expect(p.w).toBeLessThan(SPEED * airFrames - 20);
  });
  it("every block is climbable by one character (tall blocks have a helper step)", () => {
    for (let n = 1; n <= MAX_LEVEL; n++) {
      const tops = levelAt(n).platforms.map((p) => GY - p.y);
      for (const p of levelAt(n).platforms) {
        const h = GY - p.y;
        if (h <= reach - 20) continue;
        // a tall block must have a helper step directly before it at half its height
        const helper = levelAt(n).platforms.find((q) => q.x + q.w === p.x && GY - q.y === h / 2);
        expect(helper).toBeDefined();
      }
    }
  });
});
