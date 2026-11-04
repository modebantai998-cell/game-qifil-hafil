import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/use-profile";
import { GY, H, MAX_LEVEL, PH, PW, SKINS, W, isSkin, levelAt, overlap, step, touches, type Body, type Input, type Skin } from "@/lib/game";
import { savedSkin } from "@/components/Character";

type Role = "qifil" | "hafil";

export const Route = createFileRoute("/_authenticated/play/$room")({
  validateSearch: (s: Record<string, unknown>): { role: Role } => ({ role: s["role"] === "hafil" ? "hafil" : "qifil" }),
  head: () => ({
    meta: [
      { title: "Main - QIFIL DAN HAFIL" },
      { name: "description", content: "Main berdua online QIFIL DAN HAFIL." },
      { property: "og:title", content: "Main - QIFIL DAN HAFIL" },
      { property: "og:description", content: "Main berdua online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Play,
});

const QUICK = ["Sini!", "Tumpuk!", "Injak tombol!", "Ambil kunci!", "Ke pintu!", "Hore! 🎉"];

function Play() {
  const { room } = Route.useParams();
  const { role } = Route.useSearch();
  const other: Role = role === "qifil" ? "hafil" : "qifil";
  const me = useProfile();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useRef<Input>({ left: false, right: false, up: false, down: false });
  const chan = useRef<RealtimeChannel | null>(null);
  const [partnerHere, setPartnerHere] = useState(false);
  const [level, setLevel] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [text, setText] = useState("");
  const [toast, setToast] = useState("");
  const g = useRef({
    level: 1,
    mine: { x: 0, y: 0, vx: 0, vy: 0, onGround: false } as Body,
    theirs: { x: -100, y: -100, tx: -100, ty: -100, vx: 0 },
    skins: { qifil: "pink", hafil: "biru" } as Record<Role, Skin>,
    safe: { x: 80, y: 560 },
    walk: 0,
    names: { qifil: "QIFIL", hafil: "HAFIL" } as Record<Role, string>,
    bubbles: { qifil: { t: "", n: 0 }, hafil: { t: "", n: 0 } } as Record<Role, { t: string; n: number }>,
    button: false,
    keyBy: "" as "" | Role,
    winning: false,
  });

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const resetLevel = (n: number) => {
    const s = g.current;
    const L = levelAt(n);
    s.level = n; s.button = false; s.keyBy = ""; s.winning = false;
    s.mine = { x: L.spawn[role === "qifil" ? 0 : 1], y: 560, vx: 0, vy: 0, onGround: false };
    s.safe = { x: s.mine.x, y: 560 };
    setLevel(n);
  };

  useEffect(() => {
    resetLevel(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me) return;
    const s = g.current;
    s.names[role] = me.username;
    s.skins[role] = savedSkin(role);
    const ch = supabase.channel(`room:${room}`, { config: { presence: { key: role }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState<{ name: string }>();
      const here = !!st[other];
      if (here) s.names[other] = st[other]?.[0]?.name ?? s.names[other];
      const sk = (st[other]?.[0] as { skin?: string } | undefined)?.skin;
      if (isSkin(sk)) s.skins[other] = sk;
      setPartnerHere(here);
    })
      .on("broadcast", { event: "pos" }, ({ payload }) => { s.theirs.tx = payload.x; s.theirs.ty = payload.y; if (s.theirs.x < -50) { s.theirs.x = payload.x; s.theirs.y = payload.y; } })
      .on("broadcast", { event: "button" }, () => { s.button = true; })
      .on("broadcast", { event: "key" }, ({ payload }) => { s.keyBy = payload.by; })
      .on("broadcast", { event: "level" }, ({ payload }) => { flash(`🎉 Level ${payload.done} selesai!`); resetLevel(payload.next); })
      .on("broadcast", { event: "chat" }, ({ payload }) => { s.bubbles[other] = { t: payload.t, n: 200 }; })
      .subscribe((st) => { if (st === "SUBSCRIBED") ch.track({ name: me.username, skin: s.skins[role] }); });
    chan.current = ch;
    return () => { supabase.removeChannel(ch); chan.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, room, role]);

  // keyboard
  useEffect(() => {
    const map: Record<string, keyof Input> = { arrowleft: "left", a: "left", arrowright: "right", d: "right", arrowup: "up", w: "up", " ": "up", arrowdown: "down", s: "down" };
    const set = (v: boolean) => (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      const k = map[e.key.toLowerCase()];
      if (k) { input.current[k] = v; e.preventDefault(); }
    };
    const d = set(true), u = set(false);
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, []);

  // loop
  useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    let raf = 0, lastSend = 0;
    const loop = (t: number) => {
      const s = g.current;
      const L = levelAt(s.level);
      const th = s.theirs;
      const ox = th.x;
      th.x += (th.tx - th.x) * 0.35; th.y += (th.ty - th.y) * 0.35; th.vx = th.x - ox;
      const partnerRect = { x: th.x, y: th.y, w: PW, h: PH };
      s.mine = step(s.mine, input.current, [...L.platforms, partnerRect], L.width);
      let m = s.mine;
      const box = { x: m.x + 4, y: m.y + 4, w: PW - 8, h: PH - 4 };
      if (m.y > H || L.spikes.some((k) => overlap(box, k))) {
        s.mine = m = { x: s.safe.x, y: s.safe.y - 80, vx: 0, vy: 0, onGround: false };
      } else if (m.onGround && !L.spikes.some((k) => Math.abs(k.x + k.w / 2 - (m.x + PW / 2)) < k.w / 2 + 70)) {
        s.safe = { x: m.x, y: m.y };
      }
      s.walk += Math.abs(m.vx) > 0.5 ? 1 : 0;
      const send = (event: string, payload: object) => chan.current?.send({ type: "broadcast", event, payload });
      if (t - lastSend > 50) { lastSend = t; send("pos", { x: Math.round(m.x), y: Math.round(m.y) }); }

      if (!s.button && (touches(m, L.button.x, L.button.y - 10) || touches(th, L.button.x, L.button.y - 10))) {
        if (touches(m, L.button.x, L.button.y - 10)) send("button", {});
        s.button = true;
      }
      if (!s.keyBy && touches(m, L.key.x + 14, L.key.y + 7)) { s.keyBy = role; send("key", { by: role }); }
      const atDoor = (b: { x: number; y: number }) => touches(b, L.door.x + 30, L.door.y + 40, 60);
      if (role === "qifil" && !s.winning && s.button && s.keyBy && atDoor(m) && atDoor(th)) {
        s.winning = true;
        const next = s.level >= MAX_LEVEL ? 1 : s.level + 1;
        send("level", { done: s.level, next });
        flash(`🎉 Level ${s.level} selesai!`);
        resetLevel(next);
      }

      // draw
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, H);
      const cam = Math.max(0, Math.min(L.width - W, m.x + PW / 2 - W / 2));
      ctx.save(); ctx.translate(-cam, 0);
      ctx.fillStyle = "#F2884B"; ctx.strokeStyle = "#C8642A"; ctx.lineWidth = 3;
      for (const p of L.platforms) { ctx.fillRect(p.x, p.y, p.w, p.h); ctx.strokeRect(p.x + 1.5, p.y + 1.5, p.w - 3, p.h - 3); }
      ctx.fillStyle = "#555";
      for (const k of L.spikes) for (let sx = k.x; sx < k.x + k.w; sx += 16) {
        ctx.beginPath(); ctx.moveTo(sx, GY); ctx.lineTo(sx + 8, GY - k.h); ctx.lineTo(sx + 16, GY); ctx.fill();
      }
      // door
      ctx.fillStyle = s.button ? "#4ADE80" : "#5D4037"; ctx.fillRect(L.door.x, L.door.y, 60, 80);
      ctx.fillStyle = "#FFD93D"; ctx.fillRect(L.door.x + 44, L.door.y + 40, 6, 6);
      // button
      ctx.fillStyle = s.button ? "#16a34a" : "#22c55e"; ctx.fillRect(L.button.x - 25, L.button.y - (s.button ? 4 : 10), 50, s.button ? 4 : 10);
      // key
      const holder = s.keyBy ? (s.keyBy === role ? m : th) : null;
      const kx = holder ? holder.x + 6 : L.key.x, ky = holder ? holder.y - 48 : L.key.y;
      ctx.fillStyle = "gold"; ctx.fillRect(kx, ky, 20, 8); ctx.beginPath(); ctx.arc(kx + 22, ky + 4, 7, 0, Math.PI * 2); ctx.fill();

      const blink = t % 5000 < 160;
      const drawP = (who: Role, x: number, y: number, moving: boolean, air: boolean, phase: number) => {
        const c = SKINS[s.skins[who]];
        ctx.fillStyle = c.body; ctx.fillRect(x, y, PW, PH - 8);
        ctx.fillStyle = c.hat; ctx.fillRect(x - 3, y - 10, PW + 6, 12); ctx.beginPath(); ctx.arc(x + PW / 2, y - 12, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000";
        if (blink) { ctx.fillRect(x + 10, y + 15, 5, 2); ctx.fillRect(x + 25, y + 15, 5, 2); }
        else { ctx.fillRect(x + 10, y + 12, 5, 7); ctx.fillRect(x + 25, y + 12, 5, 7); }
        const sw = air ? 3 : moving ? Math.sin(phase * 0.35) * 5 : 0;
        ctx.fillRect(x + 6 + sw, y + PH - 8, 9, 8); ctx.fillRect(x + 25 - sw, y + PH - 8, 9, 8);
        ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = c.hat; ctx.fillText(s.names[who], x + PW / 2, y - 22);
        const b = s.bubbles[who];
        if (b.n > 0) {
          b.n--;
          ctx.font = "16px monospace";
          const bw = ctx.measureText(b.t).width + 20;
          ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 2;
          ctx.fillRect(x + PW / 2 - bw / 2, y - 64, bw, 28); ctx.strokeRect(x + PW / 2 - bw / 2, y - 64, bw, 28);
          ctx.fillStyle = "#000"; ctx.fillText(b.t, x + PW / 2, y - 45);
        }
        ctx.textAlign = "left";
      };
      drawP(other, th.x, th.y, Math.abs(th.vx) > 0.5, false, t / 16);
      drawP(role, m.x, m.y, Math.abs(m.vx) > 0.5, !m.onGround, s.walk);
      ctx.restore();
      // progress bar
      ctx.fillStyle = "#eee"; ctx.fillRect(440, 690, 400, 10);
      ctx.fillStyle = SKINS[s.skins[role]].body; ctx.fillRect(440, 690, (400 * m.x) / L.width, 10);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = (t: string) => {
    if (!t.trim()) return;
    g.current.bubbles[role] = { t, n: 200 };
    chan.current?.send({ type: "broadcast", event: "chat", payload: { t } });
    setText("");
  };

  const fullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape");
    } catch { /* not supported */ }
  };

  const hold = (k: keyof Input) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); input.current[k] = true; },
    onPointerUp: () => { input.current[k] = false; },
    onPointerCancel: () => { input.current[k] = false; },
    onPointerLeave: () => { input.current[k] = false; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="play-stage">
      <canvas ref={canvasRef} width={W} height={H} className="play-canvas" />

      <div className="play-hud">
        <button onClick={() => navigate({ to: "/lobby" })} className="hud-btn">✕</button>
        <span className="hud-chip">Level {level}/{MAX_LEVEL}</span>
        <span className="hud-chip">{partnerHere ? `🟢 ${g.current.names[other]}` : "⏳ Menunggu teman..."}</span>
        <button onClick={fullscreen} className="hud-btn">⛶</button>
        <button onClick={() => setChatOpen((v) => !v)} className="hud-btn">💬</button>
      </div>

      {toast && <div className="play-toast">{toast}</div>}

      {chatOpen && (
        <div className="play-chat">
          <div className="flex flex-wrap gap-1">
            {QUICK.map((q) => <button key={q} onClick={() => say(q)} className="hud-chip">{q}</button>)}
          </div>
          <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); say(text); (document.activeElement as HTMLElement)?.blur(); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={40} placeholder="Ketik..." className="pixel-input !py-1" />
            <button className="pixel-btn !py-1">Kirim</button>
          </form>
        </div>
      )}

      <div className="pad pad-left">
        <button className="pad-key" {...hold("left")}>◀</button>
        <button className="pad-key" {...hold("right")}>▶</button>
      </div>
      <div className="pad pad-right">
        <button className="pad-key" {...hold("down")}>▼</button>
        <button className="pad-key" {...hold("up")}>▲</button>
      </div>
      <div className="rotate-hint">Putar HP ke posisi mendatar 📱↔️</div>
    </div>
  );
}
