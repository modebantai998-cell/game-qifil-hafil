import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, type Profile } from "@/lib/use-profile";
import { SKINS, isSkin, type Skin } from "@/lib/game";
import { Character, savedSkin } from "@/components/Character";

export const Route = createFileRoute("/_authenticated/lobby")({
  head: () => ({
    meta: [
      { title: "Lobby - QIFIL DAN HAFIL" },
      { name: "description", content: "Buat room, ajak teman lewat ID, pilih mode dan mulai main berdua." },
      { property: "og:title", content: "Lobby - QIFIL DAN HAFIL" },
      { property: "og:description", content: "Buat room, ajak teman, pilih mode dan mulai main." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Lobby,
});

type Role = "qifil" | "hafil";
type Invite = { to: string; from: string; fromName: string; room: string };
type Seat = { name: string; pid: string; skin: Skin; ready: boolean; video?: string; mode?: number };
const MODES = [
  { lv: 1, label: "Petualangan", sub: "Mulai Lv 1" },
  { lv: 10, label: "Tantangan", sub: "Mulai Lv 10" },
  { lv: 20, label: "Ekstrem", sub: "Mulai Lv 20" },
];

function Lobby() {
  const me = useProfile();
  const navigate = useNavigate();
  const lobbyCh = useRef<RealtimeChannel | null>(null);
  const roomCh = useRef<RealtimeChannel | null>(null);
  const [online, setOnline] = useState<{ pid: string; name: string }[]>([]);
  const [team, setTeam] = useState<{ code: string; role: Role } | null>(null);
  const [mate, setMate] = useState<Seat | null>(null);
  const [skin, setSkin] = useState<Skin>("pink");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState(1);
  const [video, setVideo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [panel, setPanel] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Profile | null | "none">(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [waiting, setWaiting] = useState("");
  const role: Role = team?.role ?? "qifil";
  const host = role === "qifil";

  useEffect(() => { setSkin(savedSkin("qifil")); }, []);

  // Lobby channel: online list + invites
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel("lobby", { config: { presence: { key: me.player_id } } });
    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState<{ name: string }>();
      setOnline(Object.entries(st).map(([pid, v]) => ({ pid, name: v[0]?.name ?? "" })).filter((o) => o.pid !== me.player_id));
    })
      .on("broadcast", { event: "invite" }, ({ payload }) => { if (payload.to === me.player_id) setInvite(payload as Invite); })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload.to !== me.player_id) return;
        setWaiting("");
        if (!payload.ok) alert(`${payload.fromName} menolak ajakan.`);
      })
      .subscribe((s) => { if (s === "SUBSCRIBED") ch.track({ name: me.username }); });
    lobbyCh.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  // Room channel: team seats, host video & mode, start signal
  useEffect(() => {
    if (!me || !team) return;
    const other: Role = team.role === "qifil" ? "hafil" : "qifil";
    const ch = supabase.channel(`room:${team.code}`, { config: { presence: { key: team.role }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => setMate(ch.presenceState<Seat>()[other]?.[0] ?? null))
      .on("broadcast", { event: "start" }, ({ payload }) =>
        navigate({ to: "/play/$room", params: { room: team.code }, search: { role: team.role, lv: Number(payload.lv) || 1 } }))
      .subscribe((s) => { if (s === "SUBSCRIBED") roomCh.current = ch; });
    return () => { supabase.removeChannel(ch); roomCh.current = null; setMate(null); };
  }, [me, team, navigate]);

  // Keep my seat published
  useEffect(() => {
    if (!me || !team) return;
    const seat: Seat = { name: me.username, pid: me.player_id, skin, ready, ...(host ? { video, mode } : {}) };
    roomCh.current?.track(seat);
    const t = setInterval(() => roomCh.current?.track(seat), 1000);
    return () => clearInterval(t);
  }, [me, team, skin, ready, video, mode, host]);

  // Guests follow the host's video & mode
  const shownVideo = host ? video : mate?.video ?? "";
  const shownMode = host ? mode : mate?.mode ?? 1;

  const createRoom = () => { setTeam({ code: Math.random().toString(36).slice(2, 8).toUpperCase(), role: "qifil" }); setReady(false); };
  const leave = () => { setTeam(null); setReady(false); };

  const search = async () => {
    const id = q.trim();
    if (!/^\d{7}$/.test(id)) return setFound("none");
    const { data } = await supabase.from("profiles").select("id,username,player_id").eq("player_id", id).maybeSingle();
    setFound(data ?? "none");
  };

  const ask = (pid: string, name: string) => {
    if (!me) return;
    let code = team?.code;
    if (!team || !host) { code = Math.random().toString(36).slice(2, 8).toUpperCase(); setTeam({ code, role: "qifil" }); }
    lobbyCh.current?.send({ type: "broadcast", event: "invite", payload: { to: pid, from: me.player_id, fromName: me.username, room: code } });
    setWaiting(name);
  };

  const answer = (ok: boolean) => {
    if (!invite || !me) return;
    lobbyCh.current?.send({ type: "broadcast", event: "answer", payload: { to: invite.from, ok, fromName: me.username } });
    if (ok) { setTeam({ code: invite.room, role: "hafil" }); setReady(false); setPanel(false); }
    setInvite(null);
  };

  const upload = async (file: File) => {
    if (!me) return;
    if (file.size > 50 * 1024 * 1024) return alert("Video maksimal 50MB.");
    setUploading(true);
    const path = `${me.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("lobby-videos").upload(path, file, { contentType: file.type });
    if (!error) {
      const { data } = await supabase.storage.from("lobby-videos").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (data?.signedUrl) setVideo(data.signedUrl);
    } else alert("Gagal upload video.");
    setUploading(false);
  };

  const pick = (s: Skin) => { setSkin(s); localStorage.setItem("skin", s); };
  const canStart = host && !!team && ready && !!mate?.ready;
  const start = () => {
    if (!team) return;
    roomCh.current?.send({ type: "broadcast", event: "start", payload: { lv: mode } });
    setTimeout(() => navigate({ to: "/play/$room", params: { room: team.code }, search: { role: "qifil", lv: mode } }), 400);
  };
  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };
  const isOnline = (pid: string) => online.some((o) => o.pid === pid);

  const seat = (name: string, s: Skin, r: boolean, you: boolean) => (
    <div className="flex flex-col items-center">
      <Character skin={s} size={72} />
      <div className="ff-tag">{team ? (r ? "✔ " : "… ") : ""}{name}{you && " (kamu)"}</div>
    </div>
  );

  return (
    <main className="ff-stage ff-lock">
      <div className="ff-screen">
        {shownVideo ? <video key={shownVideo} src={shownVideo} autoPlay loop muted playsInline /> :
          <div className="flex h-full items-center justify-center p-2 text-center font-pixel text-[10px] text-background/70">
            {host ? "Upload video untuk ditonton tim" : "Menunggu video dari host"}
          </div>}
      </div>
      {host && (
        <label className="ff-chip absolute right-[24%] top-[57%] z-10 cursor-pointer">
          {uploading ? "Mengunggah..." : "🎬 Upload Video"}
          <input type="file" accept="video/*" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      )}

      <div className="ff-floor" />
      <div className="ff-chars">
        {seat(me?.username ?? "Kamu", skin, ready, true)}
        {team && (mate ? seat(mate.name, isSkin(mate.skin) ? mate.skin : "biru", mate.ready, false) :
          <button onClick={() => setPanel(true)} className="flex h-[100px] w-[72px] items-center justify-center rounded-xl border-4 border-dashed border-background/60 text-3xl text-background">+</button>)}
      </div>

      <header className="ff-top">
        <span className="ff-chip">👤 {me?.username ?? "..."} · ID {me?.player_id ?? "-------"}</span>
        {team && <span className="ff-chip">ROOM #{team.code}</span>}
        <span className="flex-1" />
        <button onClick={logout} className="ff-chip">Keluar</button>
      </header>

      <div className="ff-left">
        {!team ? <button onClick={createRoom} className="pixel-btn">BUAT ROOM</button> :
          <button onClick={leave} className="ff-chip">✕ Keluar Room</button>}
        <button onClick={() => setPanel((v) => !v)} className="pixel-btn">👥 UNDANG</button>
        {panel && (
          <div className="ff-panel">
            <div className="flex gap-1">
              <input className="pixel-input !py-1 text-xs" inputMode="numeric" maxLength={7} placeholder="Cari ID" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ""))} />
              <button onClick={search} className="pixel-btn !px-2 !py-1">🔍</button>
            </div>
            {found === "none" && <p className="mt-1 text-destructive">ID tidak ditemukan.</p>}
            {found && found !== "none" && found.player_id !== me?.player_id && (
              <div className="mt-1 flex items-center justify-between gap-1">
                <span>{found.username} {isOnline(found.player_id) ? "🟢" : "⚪"}</span>
                <button disabled={!isOnline(found.player_id)} onClick={() => ask(found.player_id, found.username)} className="pixel-btn !px-2 !py-1">Ajak</button>
              </div>
            )}
            <p className="mt-2 font-bold">Online ({online.length})</p>
            <div className="max-h-24 overflow-y-auto">
              {online.map((o) => (
                <div key={o.pid} className="flex items-center justify-between py-0.5">
                  <span className="truncate">{o.name}</span>
                  <button onClick={() => ask(o.pid, o.name)} className="pixel-btn !px-2 !py-0.5">Ajak</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="ff-right">
        <p className="font-pixel text-[9px]">SKIN</p>
        {(Object.keys(SKINS) as Skin[]).map((s) => (
          <button key={s} onClick={() => pick(s)} aria-label={SKINS[s].label}
            className={`room-swatch ${skin === s ? "ring-4 ring-foreground" : ""}`} style={{ background: SKINS[s].body }} />
        ))}
      </aside>

      <div className="ff-modes">
        {MODES.map((m) => (
          <button key={m.lv} disabled={!host} onClick={() => setMode(m.lv)} className={`ff-mode ${shownMode === m.lv ? "ff-mode-on" : ""}`}>
            {m.label}<br /><span className="font-normal opacity-70">{m.sub}</span>
          </button>
        ))}
      </div>

      <div className="ff-start">
        {team && (
          <button onClick={() => setReady((v) => !v)} className={ready ? "ff-chip" : "pixel-btn"}>{ready ? "BATAL SIAP" : "SIAP"}</button>
        )}
        {host ? (
          <button disabled={!canStart} onClick={start} className="ff-go">
            {!team ? "BUAT ROOM DULU" : !mate ? "UNDANG TEMAN" : canStart ? "MULAI ▶" : "TUNGGU SIAP"}
          </button>
        ) : <div className="ff-go opacity-70">Tunggu host…</div>}
      </div>

      {(invite || waiting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="pixel-card w-full max-w-xs text-center">
            {invite ? (
              <>
                <p className="font-bold">{invite.fromName} ngajak kamu masuk room!</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => answer(false)} className="tab-off">Tolak</button>
                  <button onClick={() => answer(true)} className="pixel-btn flex-1">Terima</button>
                </div>
              </>
            ) : (
              <>
                <p>Menunggu {waiting} menerima...</p>
                <button onClick={() => setWaiting("")} className="tab-off mt-4">Tutup</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
