import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/qifil-hafil-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QIFIL DAN HAFIL - Main Berdua Online" },
      { name: "description", content: "Game kerja sama QIFIL & HAFIL. Main berdua online dari HP masing-masing." },
      { property: "og:title", content: "QIFIL DAN HAFIL" },
      { property: "og:description", content: "Main berdua online dari HP masing-masing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Intro,
});

async function goWide() {
  try { await document.documentElement.requestFullscreen?.(); } catch { /* not allowed */ }
  try { await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape"); } catch { /* unsupported */ }
}

function Intro() {
  const [p, setP] = useState(1);
  const navigate = useNavigate();
  useEffect(() => {
    const t = setInterval(() => setP((v) => (v >= 100 ? 100 : Math.min(100, v + 1 + Math.floor(Math.random() * 4)))), 25);
    return () => clearInterval(t);
  }, []);
  const done = p >= 100;
  const enter = async () => { if (!done) return; await goWide(); navigate({ to: "/lobby" }); };
  return (
    <main className="intro ff-lock" onClick={enter}>
      <img src={logo.url} alt="QIFIL DAN HAFIL" className="w-full max-w-sm rounded-xl" />
      <div className="intro-bar"><div className="intro-fill" style={{ width: `${p}%` }} /></div>
      {done ? <p className="intro-tap">KETUK UNTUK MASUK</p> : <p className="font-pixel text-xs text-background">Memuat... {p}%</p>}
    </main>
  );
}
