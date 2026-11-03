import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import logo from "@/assets/qifil-hafil-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QIFIL DAN HAFIL - Saling Chat Saat Main" },
      { name: "description", content: "Game kerja sama QIFIL & HAFIL: injak tombol, ambil kunci, dan saling chat saat bermain." },
      { property: "og:title", content: "QIFIL DAN HAFIL" },
      { property: "og:description", content: "Game kerja sama QIFIL & HAFIL sambil saling chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

type Msg = { character: string; message: string; time: string };
type P = { x: number; y: number; vx: number; vy: number; hasKey: boolean; color: string; name: string; chatBubble: string; chatTimer: number; stacked?: boolean };

const QUICK = ["📍 Sini!", "🟩 Injak tombol!", "🤸 Tumpuk dong!", "🔑 Bawa kunci!", "⚠️ Awas duri!", "🚪 Ke pintu!"];
const now = () => new Date().toLocaleTimeString().slice(0, 5);

function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [level, setLevel] = useState(1);
  const [room, setRoom] = useState("");
  const [char, setChar] = useState<"QIFIL" | "HAFIL">("QIFIL");
  const [text, setText] = useState("");
  const msgEnd = useRef<HTMLDivElement>(null);
  const state = useRef({
    players: {
      qifil: { x: 100, y: 470, vx: 0, vy: 0, hasKey: false, color: "#FF8FAB", name: "QIFIL", chatBubble: "", chatTimer: 0 } as P,
      hafil: { x: 200, y: 470, vx: 0, vy: 0, hasKey: false, color: "#6BA5FF", name: "HAFIL", chatBubble: "", chatTimer: 0 } as P,
    },
    keys: {} as Record<string, boolean>,
    objects: { key: { x: 650, y: 320, collected: false }, button: { x: 380, y: 505, pressed: false }, door: { x: 1150, y: 400, open: false }, box: { x: 480, y: 470, w: 50, h: 50 } },
    level: 1,
  });

  const addSystem = (m: string) => setMessages((p) => [...p, { character: "System", message: m, time: now() }]);

  const send = (msg: string) => {
    if (!msg.trim()) return;
    setMessages((p) => [...p, { character: char, message: msg, time: now() }]);
    const pl = char === "QIFIL" ? state.current.players.qifil : state.current.players.hafil;
    pl.chatBubble = msg;
    pl.chatTimer = 180;
    setText("");
  };

  const toggleStack = (isQ: boolean) => {
    const { qifil, hafil } = state.current.players;
    if (Math.abs(qifil.x - hafil.x) < 60) {
      const p = isQ ? qifil : hafil;
      p.stacked = !p.stacked;
      addSystem(p.stacked ? `${p.name} numpuk!` : `${p.name} turun`);
    }
  };

  useEffect(() => { msgEnd.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  useEffect(() => {
    setRoom("QF" + Math.random().toString(36).substring(2, 6).toUpperCase());
    addSystem("Game mulai! QIFIL & HAFIL bisa saling chat saat bermain!");
    const s = state.current;
    const ctx = canvasRef.current!.getContext("2d")!;
    const isTyping = () => document.activeElement?.tagName === "INPUT";
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const k = e.key.toLowerCase();
      s.keys[k] = true;
      if (["w", "a", "s", "d", "e", "arrowup", "arrowleft", "arrowright", "arrowdown", "shift"].includes(k)) e.preventDefault();
      if (k === "e") toggleStack(true);
      if (k === "shift") toggleStack(false);
    };
    const up = (e: KeyboardEvent) => { s.keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let raf = 0;
    const loop = () => {
      const { players, objects: o, keys } = s;
      for (const id of ["qifil", "hafil"] as const) {
        const p = players[id];
        const isQ = id === "qifil";
        if (p.chatTimer > 0) p.chatTimer--;
        if (p.stacked) { const other = isQ ? players.hafil : players.qifil; p.x = other.x; p.y = other.y - 50; continue; }
        const left = isQ ? keys["a"] : keys["arrowleft"];
        const right = isQ ? keys["d"] : keys["arrowright"];
        const jump = isQ ? keys["w"] : keys["arrowup"];
        if (left) p.vx = -5; else if (right) p.vx = 5; else p.vx *= 0.75;
        if (jump && p.y >= 465) p.vy = -14;
        p.vy += 0.7; p.x += p.vx; p.y += p.vy;
        if (p.y > 470) { p.y = 470; p.vy = 0; }
        p.x = Math.max(0, Math.min(1220, p.x));
        if (Math.abs(p.x - o.box.x) < 50 && p.y > 400) o.box.x += p.vx * 0.5;
        if (!o.key.collected && Math.abs(p.x - o.key.x) < 40 && Math.abs(p.y - o.key.y) < 160) {
          o.key.collected = true; p.hasKey = true; addSystem(`${p.name}: Aku dapat kunci! Sini ke pintu!`);
        }
        if (Math.abs(p.x - o.button.x) < 45 && p.y > 430 && !o.button.pressed) {
          o.button.pressed = true; o.door.open = true; addSystem(`${p.name}: Aku injak tombol! Pintu buka!`);
        }
      }
      if (o.door.open && (players.qifil.hasKey || players.hafil.hasKey) && Math.abs(players.qifil.x - o.door.x) < 80 && Math.abs(players.hafil.x - o.door.x) < 80) {
        addSystem(`🎉 Level ${s.level} selesai! QIFIL & HAFIL kerja sama bagus!`);
        s.level++; setLevel(s.level);
        o.key.collected = false; o.button.pressed = false; o.door.open = false;
        Object.assign(players.qifil, { x: 100, hasKey: false, stacked: false });
        Object.assign(players.hafil, { x: 200, hasKey: false, stacked: false });
      }
      // draw
      const g = ctx.createLinearGradient(0, 0, 0, 720); g.addColorStop(0, "#2a3a5a"); g.addColorStop(1, "#1e2d4a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = "#8B7355"; ctx.fillRect(0, 520, 1280, 200);
      ctx.fillStyle = "#444"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(750 + i * 40, 520); ctx.lineTo(770 + i * 40, 500); ctx.lineTo(790 + i * 40, 520); ctx.fill(); }
      ctx.fillStyle = o.button.pressed ? "#4ADE80" : "#22c55e"; ctx.fillRect(o.button.x - 30, o.button.y, 60, 15);
      ctx.fillStyle = "#A0826D"; ctx.fillRect(o.box.x, o.box.y, o.box.w, o.box.h);
      if (!o.key.collected) { ctx.fillStyle = "gold"; ctx.fillRect(o.key.x, o.key.y, 28, 14); ctx.beginPath(); ctx.arc(o.key.x + 28, o.key.y + 7, 8, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = o.door.open ? "#4ADE80" : "#5D4037"; ctx.fillRect(o.door.x, o.door.y, 60, 120);
      for (const id of ["qifil", "hafil"] as const) {
        const p = players[id];
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 40, 50);
        ctx.fillStyle = id === "qifil" ? "#E94F86" : "#3B6FD9"; ctx.fillRect(p.x - 3, p.y - 14, 46, 16);
        ctx.beginPath(); ctx.arc(p.x + 20, p.y - 16, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "black"; ctx.beginPath(); ctx.arc(p.x + 12, p.y + 15, 4, 0, Math.PI * 2); ctx.arc(p.x + 28, p.y + 15, 4, 0, Math.PI * 2); ctx.fill();
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "white"; ctx.fillRect(p.x - 10, p.y - 40, 60, 16);
        ctx.fillStyle = id === "qifil" ? "#FF4D8D" : "#4D8DFF"; ctx.fillText(p.name, p.x, p.y - 28);
        if (p.chatTimer > 0 && p.chatBubble) {
          ctx.font = "14px monospace";
          const bw = ctx.measureText(p.chatBubble).width + 20;
          ctx.fillStyle = "white"; ctx.strokeStyle = "black"; ctx.lineWidth = 1;
          ctx.fillRect(p.x - bw / 2 + 20, p.y - 70, bw, 24); ctx.strokeRect(p.x - bw / 2 + 20, p.y - 70, bw, 24);
          ctx.fillStyle = "black"; ctx.fillText(p.chatBubble, p.x - bw / 2 + 30, p.y - 53);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hold = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); state.current.keys[k] = true; },
    onPointerUp: () => { state.current.keys[k] = false; },
    onPointerLeave: () => { state.current.keys[k] = false; },
  });

  const Pad = ({ who }: { who: "q" | "h" }) => {
    const q = who === "q";
    const cls = `pad-btn ${q ? "pad-q" : "pad-h"}`;
    return (
      <div className="flex gap-1">
        <button className={cls} {...hold(q ? "a" : "arrowleft")}>◀</button>
        <button className={cls} {...hold(q ? "w" : "arrowup")}>▲</button>
        <button className={cls} {...hold(q ? "d" : "arrowright")}>▶</button>
        <button className={cls} onPointerDown={() => toggleStack(q)}>🤸</button>
      </div>
    );
  };

  return (
    <div className="game-shell">
      <header className="game-topbar">
        <img src={logo.url} alt="Logo QIFIL DAN HAFIL" className="h-12 w-auto rounded-md" />
        <div className="text-xs sm:text-sm">Room: <b>{room}</b> | Level <b>{level}</b></div>
        <div className="hidden text-xs md:block">
          <span className="text-qifil font-bold">QIFIL: WASD+E</span> | <span className="text-hafil font-bold">HAFIL: Arrow+Shift</span>
        </div>
      </header>

      <canvas ref={canvasRef} width={1280} height={720} className="game-canvas" />

      <div className="flex justify-between gap-2 px-2 py-2 md:hidden">
        <Pad who="q" /><Pad who="h" />
      </div>

      <section className="chat-box">
        <div className="mb-1.5 text-xs">💬 <b>QIFIL & HAFIL SALING CHAT SAAT BERMAIN</b></div>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {QUICK.map((q) => <button key={q} className="quick-btn" onClick={() => send(q)}>{q}</button>)}
        </div>
        <div className="mb-2 flex max-h-40 flex-col gap-0.5 overflow-y-auto">
          {messages.slice(-20).map((m, i) => (
            <div key={i} className={`msg ${m.character === "QIFIL" ? "msg-q" : m.character === "HAFIL" ? "msg-h" : "msg-sys"}`}>
              <b>{m.character}:</b> {m.message} <small className="opacity-60">{m.time}</small>
            </div>
          ))}
          <div ref={msgEnd} />
        </div>
        <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); send(text); (document.activeElement as HTMLElement)?.blur(); }}>
          <select value={char} onChange={(e) => setChar(e.target.value as "QIFIL" | "HAFIL")} className="chat-field">
            <option value="QIFIL">QIFIL PINK</option><option value="HAFIL">HAFIL BIRU</option>
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ketik pesan..." className="chat-field min-w-0 flex-1" />
          <button type="submit" className="send-btn">Kirim</button>
        </form>
      </section>
    </div>
  );
}
