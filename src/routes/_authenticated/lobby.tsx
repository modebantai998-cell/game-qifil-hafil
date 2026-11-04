import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, type Profile } from "@/lib/use-profile";
import logo from "@/assets/qifil-hafil-logo.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/lobby")({
  head: () => ({
    meta: [
      { title: "Lobby - QIFIL DAN HAFIL" },
      { name: "description", content: "Cari teman lewat ID dan ajak main berdua." },
      { property: "og:title", content: "Lobby - QIFIL DAN HAFIL" },
      { property: "og:description", content: "Cari teman lewat ID dan ajak main berdua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Lobby,
});

type Invite = { to: string; from: string; fromName: string; room: string };

function Lobby() {
  const me = useProfile();
  const navigate = useNavigate();
  const chan = useRef<RealtimeChannel | null>(null);
  const [online, setOnline] = useState<{ pid: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Profile | null | "none">(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [waiting, setWaiting] = useState("");

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
        if (payload.ok) navigate({ to: "/room/$room", params: { room: payload.room }, search: { role: "qifil" } });
        else alert(`${payload.fromName} menolak ajakan.`);
      })
      .subscribe((s) => { if (s === "SUBSCRIBED") ch.track({ name: me.username }); });
    chan.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [me, navigate]);

  const search = async () => {
    const id = q.trim();
    if (!/^\d{7}$/.test(id)) return setFound("none");
    const { data } = await supabase.from("profiles").select("id,username,player_id").eq("player_id", id).maybeSingle();
    setFound(data ?? "none");
  };

  const ask = (pid: string, name: string) => {
    if (!me) return;
    const room = Math.random().toString(36).slice(2, 8).toUpperCase();
    chan.current?.send({ type: "broadcast", event: "invite", payload: { to: pid, from: me.player_id, fromName: me.username, room } });
    setWaiting(name);
  };

  const answer = (ok: boolean) => {
    if (!invite || !me) return;
    chan.current?.send({ type: "broadcast", event: "answer", payload: { to: invite.from, ok, room: invite.room, fromName: me.username } });
    if (ok) navigate({ to: "/room/$room", params: { room: invite.room }, search: { role: "hafil" } });
    setInvite(null);
  };

  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };
  const isOnline = (pid: string) => online.some((o) => o.pid === pid);

  return (
    <main className="pixel-page">
      <header className="mx-auto flex max-w-md items-center justify-between">
        <img src={logo.url} alt="QIFIL DAN HAFIL" className="h-14 rounded-md" />
        <button onClick={logout} className="tab-off !w-auto px-3">Keluar</button>
      </header>

      <section className="pixel-card mx-auto mt-4 max-w-md text-center">
        <p className="text-xs text-muted-foreground">Halo, {me?.username ?? "..."}</p>
        <p className="mt-1 text-xs">ID kamu</p>
        <p className="font-pixel text-3xl tracking-widest text-primary">{me?.player_id ?? "-------"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Kasih ID ini ke temanmu</p>
      </section>

      <section className="pixel-card mx-auto mt-4 max-w-md">
        <p className="mb-2 font-pixel text-xs">🔍 CARI ID</p>
        <div className="flex gap-2">
          <input className="pixel-input" inputMode="numeric" maxLength={7} placeholder="7 angka" value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ""))} />
          <button onClick={search} className="pixel-btn">Cari</button>
        </div>
        {found === "none" && <p className="mt-2 text-sm text-destructive">ID tidak ditemukan.</p>}
        {found && found !== "none" && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-muted p-3">
            <div>
              <p className="font-bold">{found.username}</p>
              <p className="text-xs text-muted-foreground">ID {found.player_id} · {isOnline(found.player_id) ? "🟢 online" : "⚪ offline"}</p>
            </div>
            {found.player_id !== me?.player_id && (
              <button disabled={!isOnline(found.player_id)} onClick={() => ask(found.player_id, found.username)} className="pixel-btn">Ajak Main</button>
            )}
          </div>
        )}
      </section>

      <section className="pixel-card mx-auto mt-4 max-w-md">
        <p className="mb-2 font-pixel text-xs">🟢 ONLINE ({online.length})</p>
        {online.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pemain lain online.</p>}
        {online.map((o) => (
          <div key={o.pid} className="flex items-center justify-between border-t py-2">
            <span>{o.name} <small className="text-muted-foreground">#{o.pid}</small></span>
            <button onClick={() => ask(o.pid, o.name)} className="pixel-btn !py-1 text-xs">Ajak</button>
          </div>
        ))}
      </section>

      {(invite || waiting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="pixel-card w-full max-w-xs text-center">
            {invite ? (
              <>
                <p className="font-bold">{invite.fromName} ngajak kamu main!</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => answer(false)} className="tab-off">Tolak</button>
                  <button onClick={() => answer(true)} className="pixel-btn flex-1">Terima</button>
                </div>
              </>
            ) : (
              <>
                <p>Menunggu {waiting} menerima...</p>
                <button onClick={() => setWaiting("")} className="tab-off mt-4">Batal</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
