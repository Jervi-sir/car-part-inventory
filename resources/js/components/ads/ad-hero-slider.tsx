import React from "react";
import { usePage } from "@inertiajs/react";
import { Card } from "../ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HeroAd = {
  id: number | string;
  src: string;
  alt: string;
  href?: string;
  title?: string;
  subtitle?: string;
};

type AdsMap = Record<string, HeroAd[]>;

export function AdsHeroSlider({
  items,
  placement = "hero",
  className = "",
}: {
  items?: HeroAd[];
  placement?: string;
  className?: string;
}) {
  const { props } = usePage<{ ads?: AdsMap }>();
  const fromInertia = (props?.ads && (props.ads as any)[placement]) || [];
  const data: HeroAd[] = items?.length ? items : fromInertia;

  if (!data?.length) return null;

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = React.useState(0);
  const [hover, setHover] = React.useState(false);
  const INTERVAL = 4500;
  const clamp = (i: number) => (i + data.length) % data.length;

  const snapTo = React.useCallback((i: number) => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  // mark seen (for server-side frequency capping via cookie)
  React.useEffect(() => {
    if (!data.length || typeof document === "undefined") return;
    try {
      const key = `ads_seen_${placement}`;
      document.cookie = `${key}=${encodeURIComponent(JSON.stringify(data.map((a) => a.id)))}; Path=/; Max-Age=${
        60 * 60
      }; SameSite=Lax`;
    } catch {}
  }, [data, placement]);

  // Auto-advance (no page jump)
  React.useEffect(() => {
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let t: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      t = setTimeout(() => {
        if (!hover && document.visibilityState === "visible") {
          const next = clamp(index + 1);
          setIndex(next);
          snapTo(next);
        }
        tick();
      }, INTERVAL);
    };
    tick();
    return () => {
      if (t) clearTimeout(t);
    };
  }, [index, hover, data.length, snapTo]);

  // Track index on manual scroll
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let rAF: number | null = null;
    const onScroll = () => {
      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        const w = el.clientWidth || 1;
        const i = Math.round(el.scrollLeft / w);
        setIndex(clamp(i));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rAF) cancelAnimationFrame(rAF);
    };
  }, [data.length]);

  // Keyboard arrows
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = clamp(index + dir);
      setIndex(next);
      snapTo(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, snapTo]);

  return (
    <Card
      className={`p-0 overflow-hidden ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <style>{`
        .hs-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .hs-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Non-scrolling overlay wrapper to keep arrows fixed */}
      <div className="relative">
        {/* Slides (scrollable) */}
        <div
          ref={wrapRef}
          className="hs-scroll relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth w-full touch-pan-x overscroll-x-contain"
        >
          {data.map((ad, i) => {
            const Slide = (
              <div
                className="relative shrink-0 snap-start w-full aspect-[16/4] md:aspect-[16/4] lg:aspect-[30/2]"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${data.length}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ad.src}
                  alt={ad.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
                {(ad.title || ad.subtitle) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent" />
                    <div className="absolute left-4 md:left-16 bottom-4 md:bottom-6 text-white drop-shadow">
                      {ad.title && <div className="text-lg md:text-2xl font-semibold">{ad.title}</div>}
                      {ad.subtitle && <div className="text-xs md:text-sm opacity-90">{ad.subtitle}</div>}
                    </div>
                  </>
                )}
              </div>
            );

            return ad.href ? (
              <a key={ad.id} href={ad.href} className="w-full shrink-0 snap-start">
                {Slide}
              </a>
            ) : (
              <div key={ad.id} className="w-full shrink-0 snap-start">
                {Slide}
              </div>
            );
          })}
        </div>

        {/* Arrows (overlay that does NOT scroll away) */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-1 md:px-2">
          <button
            aria-label="Previous slide"
            className="pointer-events-auto rounded-full bg-black/40 hover:bg-black/60 text-white p-2 md:p-2.5 backdrop-blur"
            onClick={() => {
              const prev = clamp(index - 1);
              setIndex(prev);
              snapTo(prev);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Next slide"
            className="pointer-events-auto rounded-full bg-black/40 hover:bg-black/60 text-white p-2 md:p-2.5 backdrop-blur"
            onClick={() => {
              const next = clamp(index + 1);
              setIndex(next);
              snapTo(next);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
