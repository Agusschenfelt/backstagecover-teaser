import { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  const tracks = useMemo(
    () => [
      { id: 1, logo: "/logos/Logo-01.png", glow: "#9B5DE5", src: "/snippets/snippet-01.mp3" },
      { id: 2, logo: "/logos/Logo-02.png", glow: "#F9C80E", src: "/snippets/snippet-02.mp3" },
      { id: 3, logo: "/logos/Logo-03.png", glow: "#F24B4B", src: "/snippets/snippet-03.mp3" },
      { id: 4, logo: "/logos/Logo-04.png", glow: "#3A86FF", src: "/snippets/snippet-04.mp3" },
      { id: 5, logo: "/logos/Logo-05.png", glow: "#FF99C8", src: "/snippets/snippet-05.mp3" },
    ],
    []
  );

  // ===== Motor de audio (buffers en RAM) =====
  const ctxRef = useRef(null);
  const buffersRef = useRef(new Map());
  const unlockedRef = useRef(false);
  const currentRef = useRef({ src: null, gain: null });
  const [current, setCurrent] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const ACtx = window.AudioContext || window.webkitAudioContext;
    if (!ACtx) return;
    const init = async () => {
      ctxRef.current = new ACtx();
      await Promise.all(
        tracks.map(async (t) => {
          const res = await fetch(t.src, { cache: "force-cache" });
          const arr = await res.arrayBuffer();
          const buf = await ctxRef.current.decodeAudioData(arr.slice(0));
          if (alive) buffersRef.current.set(t.id, buf);
        })
      );
      if (alive) setReady(true);
    };
    init();
    return () => {
      alive = false;
      try { currentRef.current.src?.stop(); } catch {}
    };
  }, [tracks]);

  const unlock = async () => {
    if (unlockedRef.current) return true;
    const ctx = ctxRef.current;
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { return false; }
    }
    unlockedRef.current = true;
    return true;
  };

  const playId = (id) => {
    const ctx = ctxRef.current;
    const buf = buffersRef.current.get(id);
    if (!ctx || !buf) return;
    stopAll();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 1;
    src.connect(gain).connect(ctx.destination);
    src.start(0);
    currentRef.current = { src, gain };
    setCurrent(id);
  };

  const stopAll = () => {
    const { src } = currentRef.current;
    if (src) { try { src.stop(0); } catch {} }
    currentRef.current = { src: null, gain: null };
    setCurrent(null);
  };

  // ===== Handlers =====
  const onHover = (id) => {
    if (!unlockedRef.current || !ready) return;
    playId(id);
  };
  const onLeave = () => stopAll();
  const onClick = async (id) => {
    const ok = await unlock();
    if (!ok) return;
    playId(id);
  };

  // ===== UI =====
  // tamaño de logo (se achica un poco si la altura de la pantalla es pequeña)
  const baseLogoClass =
    "aspect-square object-contain select-none transform-gpu will-change-transform transition-transform duration-500 ease-out";
  // w-20 (80px) base, sube a w-28 (112px) en >=640px; en pantallas muy bajas, reducimos
  const sizeClasses =
    "w-20 sm:w-28 [@media(max-height:680px)]:w-16 [@media(max-height:580px)]:w-14";

  return (
    <main
      className="
        bg-white overflow-hidden relative
        h-svh md:h-dvh    /* alto exacto de viewport en móvil/desktop */
        flex items-center justify-center
      "
    >
      {/* wrapper: columna en mobile / fila en desktop */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-14">
        {tracks.map((t) => {
          const active = current === t.id;
          const glowFilter = active
            ? `drop-shadow(0 0 6px ${t.glow}66) drop-shadow(0 0 14px ${t.glow}55) drop-shadow(0 0 22px ${t.glow}40)`
            : "none";

          return (
            <button
              key={t.id}
              onMouseEnter={() => onHover(t.id)}
              onMouseLeave={onLeave}
              onTouchStart={() => onClick(t.id)}
              onClick={() => onClick(t.id)}
              className="rounded-full"
              aria-label="play snippet"
            >
              <img
                src={t.logo}
                alt=""
                draggable="false"
                className={[
                  baseLogoClass,
                  sizeClasses,
                  active ? "scale-110" : "hover:scale-105",
                ].join(" ")}
                style={{ filter: glowFilter, transition: "filter 250ms ease" }}
              />
            </button>
          );
        })}
      </div>

      {/* firma/link discreto — siempre visible, sin superponerse (safe-area) */}
      <a
        href="https://instagram.com/ara____official"
        target="_blank"
        rel="noreferrer"
        className="
          absolute left-0 right-0 text-center
          text-[10px] sm:text-xs tracking-widest
          text-black/30 hover:text-black/70 transition-colors
        "
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          pointerEvents: "auto",
        }}
      >
        BACKSTAGE COVER VOL. I — ARA
      </a>
    </main>
  );
}
