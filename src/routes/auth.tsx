import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isValidUsername, usernameToEmail } from "@/lib/game";
import logo from "@/assets/qifil-hafil-logo.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Daftar / Masuk - QIFIL DAN HAFIL" },
      { name: "description", content: "Buat akun dengan nama dan password untuk main QIFIL DAN HAFIL berdua online." },
      { property: "og:title", content: "Daftar / Masuk - QIFIL DAN HAFIL" },
      { property: "og:description", content: "Buat akun dan main berdua online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"daftar" | "masuk">("daftar");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!isValidUsername(name)) return setErr("Nama 3-20 huruf/angka, tanpa spasi.");
    if (pass.length < 6) return setErr("Password minimal 6 karakter.");
    setBusy(true);
    const email = usernameToEmail(name);
    const res =
      mode === "daftar"
        ? await supabase.auth.signUp({ email, password: pass, options: { data: { username: name.trim() } } })
        : await supabase.auth.signInWithPassword({ email, password: pass });
    setBusy(false);
    if (res.error) {
      const m = res.error.message;
      return setErr(m.includes("already") ? "Nama sudah dipakai." : m.includes("Invalid") ? "Nama atau password salah." : m);
    }
    navigate({ to: "/lobby" });
  };

  return (
    <main className="pixel-page">
      <img src={logo.url} alt="QIFIL DAN HAFIL" className="mx-auto w-full max-w-sm rounded-xl" />
      <form onSubmit={submit} className="pixel-card mx-auto mt-6 w-full max-w-sm space-y-3">
        <div className="flex gap-2">
          {(["daftar", "masuk"] as const).map((m) => (
            <button type="button" key={m} onClick={() => setMode(m)} className={mode === m ? "tab-on" : "tab-off"}>
              {m === "daftar" ? "DAFTAR" : "MASUK"}
            </button>
          ))}
        </div>
        <input className="pixel-input" placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" />
        <div className="relative">
          <input className="pixel-input pr-12" type={show ? "text" : "password"} placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === "daftar" ? "new-password" : "current-password"} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan password" : "Lihat password"} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-xl">{show ? "🙈" : "👁️"}</button>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="pixel-btn w-full">{busy ? "..." : mode === "daftar" ? "DAFTAR & MASUK" : "MASUK"}</button>
      </form>
    </main>
  );
}
