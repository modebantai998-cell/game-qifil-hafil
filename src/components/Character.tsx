import { useEffect, useState } from "react";
import { SKINS, isSkin, type Skin } from "@/lib/game";

/** Pico-Park style character for menus: blinks every 5 s and taps its feet. */
export function Character({ skin, size = 80 }: { skin: Skin; size?: number }) {
  const c = SKINS[skin];
  const [blink, setBlink] = useState(false);
  const [leg, setLeg] = useState(0);
  useEffect(() => {
    const b = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 160); }, 5000);
    const l = setInterval(() => setLeg((v) => (v + 1) % 2), 450);
    return () => { clearInterval(b); clearInterval(l); };
  }, []);
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 52" aria-hidden>
      <rect x="0" y="12" width="40" height="32" rx="3" fill={c.body} />
      <rect x="-2" y="6" width="44" height="9" rx="2" fill={c.hat} />
      <circle cx="20" cy="5" r="4" fill={c.hat} />
      <rect x="10" y={blink ? 26 : 22} width="5" height={blink ? 1.5 : 7} fill="#000" />
      <rect x="25" y={blink ? 26 : 22} width="5" height={blink ? 1.5 : 7} fill="#000" />
      <rect x={leg ? 6 : 8} y="44" width="9" height="8" fill="#000" />
      <rect x={leg ? 27 : 25} y="44" width="9" height="8" fill="#000" />
    </svg>
  );
}

export const savedSkin = (role: "qifil" | "hafil"): Skin => {
  const s = typeof localStorage !== "undefined" ? localStorage.getItem("skin") : null;
  return isSkin(s) ? s : role === "qifil" ? "pink" : "biru";
};
