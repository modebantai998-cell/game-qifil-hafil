import { createFileRoute, Link } from "@tanstack/react-router";
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
  component: Home,
});

function Home() {
  return (
    <main className="pixel-page flex flex-col items-center justify-center">
      <img src={logo.url} alt="QIFIL DAN HAFIL" className="w-full max-w-md rounded-xl" />
      <Link to="/lobby" className="pixel-btn mt-8 px-10">MAIN ▶</Link>
    </main>
  );
}
