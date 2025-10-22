import { useMemo, useState } from "react";

export default function App() {
  const tracks = [
    {
      id: 1,
      logo: "/logos/Logo-01.png",
      color: "#9B5DE5",
      src: "/snippets/snippet-01.mp3",
    },
    {
      id: 2,
      logo: "/logos/Logo-02.png",
      color: "#F9C80E",
      src: "/snippets/snippet-02.mp3",
    },
    {
      id: 3,
      logo: "/logos/Logo-03.png",
      color: "#F24B4B",
      src: "/snippets/snippet-03.mp3",
    },
    {
      id: 4,
      logo: "/logos/Logo-04.png",
      color: "#3A86FF", 
      src: "/snippets/snippet-04.mp3",
    },
    {
      id: 5,
      logo: "/logos/Logo-05.png",
      color: "#FF99C8",
      src: "/snippets/snippet-05.mp3",
    },
  ];

  const [current, setCurrent] = useState(null);

  // crear objetos de Audio
  const audios = useMemo(() => {
    const m = new Map();
    for (const t of tracks) {
      const a = new Audio(t.src);
      a.preload = "none";
      a.loop = true;
      m.set(t.id, a);
    }
    return m;
  }, []);

  const stopAll = () => {
    for (const a of audios.values()) {
      a.pause();
      a.currentTime = 0;
    }
  };

  const play = (id) => {
    stopAll();
    const audio = audios.get(id);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {}); // necesario para iOS
    setCurrent(id);
  };

  const stop = () => {
    stopAll();
    setCurrent(null);
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-14">
        {tracks.map((t) => {
          const active = current === t.id;

          // efecto de brillo que nace en el contorno del PNG/WebP (sin halo redondo)
          const glowFilter = active
            ? `
              drop-shadow(0 0 6px ${t.color}66)
              drop-shadow(0 0 12px ${t.color}55)
              drop-shadow(0 0 22px ${t.color}40)
            `
            : "none";

          return (
            <button
              key={t.id}
              onMouseEnter={() => play(t.id)}
              onMouseLeave={stop}
              onTouchStart={() => play(t.id)}
              onTouchEnd={stop}
              className="transition-transform duration-200"
              style={{ borderRadius: 9999 }}
            >
               <img
                src={t.logo}
                alt={`logo-${t.id}`}
                draggable="false"
                className={[
                  "w-24 sm:w-32 aspect-square object-contain select-none",
                  "transform-gpu will-change-transform",              // renderiza en GPU
                  "transition-transform duration-900 ease-out",       // 👈 transición SUAVE
                  active ? "scale-110" : "hover:scale-105"            // hover 105 / activo 110
                ].join(" ")}
                style={{
                  filter: glowFilter,
                  transition: "filter 250ms ease"                     // brillo también suave
                }}
              />

            </button>
          );
        })}
        <p className="absolute bottom-8 w-full text-center text-[10px] sm:text-xs text-black/30 tracking-widest">
          <a href="https://www.instagram.com/ara.youngboy/" target="_blank" className="hover:text-black/60">BACKSTAGE COVER VOL. I</a>
        </p>

      </div>
    </main>
  );
}
