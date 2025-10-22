import { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  // --- tus datos ---
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

  // --- detección iOS ---
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/i.test(navigator.userAgent);

  // --- estado UI ---
  const [current, setCurrent] = useState(null);  // id sonando (glow fuerte)
  const [hovered, setHovered] = useState(null);  // id hover (glow suave)
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // ============================================================
  // ============   A) Desktop/Android (WebAudio)   =============
  // ============================================================
  const ACtx = (window.AudioContext || window.webkitAudioContext);
  const ctxRef = useRef(null);
  const buffersRef = useRef(new Map());
  const currentRef = useRef({ src: null, gain: null });

  const webAudioInit = async () => {
    if (!ACtx) return;
    ctxRef.current = new ACtx();
    await Promise.all(
      tracks.map(async (t) => {
        const res = await fetch(t.src, { cache: "force-cache" });
        const arr = await res.arrayBuffer();
        const buf = await ctxRef.current.decodeAudioData(arr.slice(0));
        buffersRef.current.set(t.id, buf);
      })
    );
    setReady(true);
  };

  const webAudioUnlock = async () => {
    if (!ctxRef.current) return false;
    try {
      if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
      // buffer silencioso para asegurar compatibilidad
      const s = ctxRef.current.createBufferSource();
      s.buffer = ctxRef.current.createBuffer(1, 1, 22050);
      s.connect(ctxRef.current.destination);
      s.start(0);
      setUnlocked(true);
      return true;
    } catch {
      return false;
    }
  };

  const webAudioPlay = (id) => {
    const ctx = ctxRef.current;
    const buf = buffersRef.current.get(id);
    if (!ctx || !buf) return;
    // stop anterior
    try { currentRef.current.src?.stop(0); } catch {}
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

  const webAudioStop = () => {
    try { currentRef.current.src?.stop(0); } catch {}
    currentRef.current = { src: null, gain: null };
    setCurrent(null);
  };

  // ============================================================
  // ============   B) iOS (fallback HTMLAudio)       ===========
  // ============================================================
  const audioElsRef = useRef(new Map()); // id -> HTMLAudioElement

  const iosInit = () => {
    tracks.forEach((t) => {
      const a = new Audio(t.src);
      a.preload = "auto";
      a.loop = true;
      a.playsInline = true;
      a.crossOrigin = "anonymous";
      audioElsRef.current.set(t.id, a);
    });
    setReady(true);
  };

  const iosPlay = async (id) => {
    // parar todos y reproducir el nuevo en el MISMO gesto
    for (const [k, a] of audioElsRef.current.entries()) {
      if (k !== id) { a.pause(); a.currentTime = 0; }
    }
    const a = audioElsRef.current.get(id);
    if (!a) return;
    try {
      a.currentTime = 0;
      await a.play(); // debe llamarse en el mismo pointerdown
      setCurrent(id);
    } catch {}
  };

  const iosStop = () => {
    for (const a of audioElsRef.current.values()) {
      a.pause();
      a.currentTime = 0;
    }
    setCurrent(null);
  };

  // boot
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isIOS) iosInit();
      else await webAudioInit();
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
      if (isIOS) iosStop();
      else webAudioStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====================== handlers ============================
  const onHoverEnter = (id) => {
    setHovered(id);                    // hover visual SIEMPRE
    if (!isIOS && unlocked && ready) { // en desktop, si ya hubo click, suena en hover
      webAudioPlay(id);
    }
  };

  const onHoverLeave = () => {
    setHovered(null);
    if (isIOS) iosStop(); else webAudioStop();
  };

  // 👇 clave para iPhone: usar pointerdown + preventDefault + reproducir YA
  const onPointerDown = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ready) return;

    if (isIOS) {
      if (!unlocked) setUnlocked(true); // "unlock" lógico
      await iosPlay(id);                // ▶️ cambia al instante
    } else {
      if (!unlocked) {
        const ok = await webAudioUnlock();
        if (!ok) return;
      }
      webAudioPlay(id);                 // ▶️ cambia al instante
    }
  };

  // ======================== UI ================================
  const baseLogo =
    "aspect-square object-contain select-none transform-gpu will-change-transform transition-transform duration-500 ease-out";
  const size =
    "w-20 sm:w-28 [@media(max-height:680px)]:w-16 [@media(max-height:580px)]:w-14";

  return (
    <main
      className="bg-white overflow-hidden relative h-[100svh] md:h-[100dvh] flex items-center justify-center"
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-14">
        {tracks.map((t) => {
          const active = current === t.id;
          const isHover = hovered === t.id;
          const glow = active
            ? `drop-shadow(0 0 6px ${t.glow}66) drop-shadow(0 0 14px ${t.glow}55) drop-shadow(0 0 22px ${t.glow}40)`
            : isHover
              ? `drop-shadow(0 0 8px ${t.glow}2e)`
              : "none";

          return (
            <button
              key={t.id}
              onMouseEnter={() => onHoverEnter(t.id)}
              onMouseLeave={onHoverLeave}
              onPointerDown={(e) => onPointerDown(e, t.id)}
              type="button"
              className="rounded-full"
              aria-label="play snippet"
            >
              <img
                src={t.logo}
                alt=""
                draggable="false"
                className={[
                  baseLogo,
                  size,
                  active ? "scale-110" : isHover ? "scale-105" : ""
                ].join(" ")}
                style={{ filter: glow, transition: "filter 250ms ease" }}
              />
            </button>
          );
        })}
      </div>

      {/* firma / link */}
      <a
        href="https://www.instagram.com/ara.youngboy/"
        target="_blank"
        rel="noreferrer"
        className="absolute left-0 right-0 text-center text-[10px] sm:text-xs tracking-widest text-black/30 hover:text-black/70 transition-colors"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}
      >
        BACKSTAGE COVER VOL. I — ARA
      </a>
    </main>
  );
}
