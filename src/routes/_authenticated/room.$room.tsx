import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/use-profile";
import { SKINS, isSkin, type Skin } from "@/lib/game";
import { Character } from "@/components/Character";

type Role = "qifil" | "hafil";
type Seat = { name: string; skin: Skin; ready: boolean; pid: string };

export const Route = createFileRoute("/_authenticated/room/$room")({
  validateSearch: (s: Record<string, unknown>): { role: Role } => ({ role: s["role"] === "hafil" ? "hafil" : "qifil" }),
  head: () => ({
    meta: [
      { title: "Ruang Tim - QIFIL DAN HAFIL" },
      { name: "description", content: "Pilih warna karakter, tekan siap, lalu mulai main berdua." },
      { property: "og:title", content: "Ruang Tim - QIFIL DAN HAFIL" },
      { property: "og:description", content: "Pilih warna karakter dan mulai main berdua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomLobby,
});

export const savedSkin = (role: Role): Skin => {
  const s = typeof localStorage !== "undefined" ? localStorage.getItem("skin") : null;
  return isSkin(s) ? s : role === "qifil" ? "pink" : "biru";
};

function RoomLobby() {
  const { room } = Route.useParams();
  const { role } = Route.useSearch();
  const other: Role = role === "qifil" ? "hafil" : "qifil";
  const me = useProfile();
  const navigate = useNavigate();
  const chan = useRef<RealtimeChannel | null>(null);
  const [skin, setSkin] = useState<Skin>("pink");
  const [ready, setReady] = useState(false);
  const [mate, setMate] = useState<Seat | null>(null);

  useEffect(() => { setSkin(savedSkin(role)); }, [role]);

  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel(`room:${room}`, { config: { presence: { key: role }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState<Seat>();
      setMate(st[other]?.[0] ?? null);
    })
      .on("broadcast", { event: "start" }, () => navigate({ to: "/play/$room", params: { room }, search: { role } }))
      .subscribe((s) => { if (s === "SUBSCRIBED") chan.current = ch; });
    return () => { supabase.removeChannel(ch); chan.current = null; };
  }, [me, room, role, other, navigate]);

  useEffect(() => {
    if (!me) return;
    const t = setInterval(() => {
      chan.current?.track({ name: me.username, pid: me.player_id, skin, ready });
    }, 400);
    chan.current?.track({ name: me.username, pid: me.player_id, skin, ready });
    return () => clearInterval(t);
  }, [me, skin, ready]);

  const pick = (s: Skin) => { setSkin(s); localStorage.setItem("skin", s); };
  const canStart = role === "qifil" && ready && !!mate?.ready;
  const start = () => {
    chan.current?.send({ type: "broadcast", event: "start", payload: {} });
    navigate({ to: "/play/$room", params: { room }, search: { role } });
  };

  const seat = (name: string, s: Skin, r: boolean, you: boolean) => (
    <div className="flex flex-col items-center">
      <Character skin={s} size={110} />
      <div className="room-tag mt-2">
        {r ? "✔" : "…"} {name} {you && <small className="opacity-70">(kamu)</small>}
      </div>
    </div>
  );

  return (
    <main className="room-stage">
      <header className="room-top">
        <button onClick={() => navigate({ to: "/lobby" })} className="hud-btn">✕</button>
        <span className="room-chip">👤 {me?.username ?? "..."} · ID {me?.player_id ?? "-------"}</span>
        <span className="room-chip">TIM #{room}</span>
      </header>

      <div className="room-hint">
        {!mate ? "⏳ Menunggu teman masuk ruang..." : ready && mate.ready ? "Semua siap!" : "Mohon tekan SIAP agar tim bisa mulai main"}
      </div>

      <section className="room-floor">
        {seat(me?.username ?? "Kamu", skin, ready, true)}
        {mate ? seat(mate.name, isSkin(mate.skin) ? mate.skin : "biru", mate.ready, false) : (
          <div className="flex h-[150px] w-[110px] items-center justify-center rounded-xl border-4 border-dashed border-foreground/40 text-3xl">?</div>
        )}
      </section>

      <aside className="room-skins">
        <p className="mb-1 font-pixel text-[10px]">WARNA</p>
        {(Object.keys(SKINS) as Skin[]).map((s) => (
          <button key={s} onClick={() => pick(s)} aria-label={SKINS[s].label}
            className={`room-swatch ${skin === s ? "ring-4 ring-foreground" : ""}`} style={{ background: SKINS[s].body }} />
        ))}
      </aside>

      <div className="room-actions">
        <button onClick={() => setReady((v) => !v)} className={ready ? "tab-off !w-auto px-5" : "pixel-btn px-5"}>
          {ready ? "BATAL SIAP" : "SIAP"}
        </button>
        {role === "qifil" ? (
          <button disabled={!canStart} onClick={start} className="room-start">MULAI ▶</button>
        ) : (
          <div className="room-start opacity-70">Tunggu mulai…</div>
        )}
      </div>
    </main>
  );
}
