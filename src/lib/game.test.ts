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
