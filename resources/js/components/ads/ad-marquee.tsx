import { Card } from "../ui/card";
type ImageAd = {
  id: number | string;
  href?: string;        // click-through
  src: string;          // main image (webp/jpg/png)
  srcset?: string;      // optional responsive srcset
  alt: string;          // accessibility
};


export function AdMarquee({ items, className = "" }: { items: ImageAd[]; className?: string }) {
  if (!items?.length) return null;
  const loop = [...items, ...items]; // seamless

  return (
    <Card className={`overflow-hidden p-0 ${className}`}>
      <style>{`
        @keyframes _imgmarq {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .imgmarq {
          position: relative;
          height: 84px;            /* container height */
          background: hsl(var(--muted) / 0.25);
        }
        @media (max-width: 768px) {
          .imgmarq { height: 68px; }
        }
        .imgmarq-track {
          display: flex;
          align-items: center;
          gap: 1.25rem;            /* distance between banners */
          min-width: 200%;
          will-change: transform;
          animation: _imgmarq 30s linear infinite;
          padding-inline: 1rem;
        }
        .imgmarq:hover .imgmarq-track { animation-play-state: paused; }
        .imgmarq-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 64px;            /* banner box height */
          border-radius: 10px;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          overflow: hidden;
          padding: 0;              /* images edge-to-edge */
        }
        @media (max-width: 768px) {
          .imgmarq-item { height: 56px; }
        }
        .imgmarq-img {
          height: 100%;
          width: auto;             /* keep banner aspect */
          object-fit: cover;
          display: block;
        }
      `}</style>

      <div className="imgmarq">
        <div className="imgmarq-track">
          {loop.map((ad, i) => {
            const Inner = (
              <img
                className="imgmarq-img"
                src={ad.src}
                srcSet={ad.srcset}
                sizes="(max-width: 768px) 220px, 320px"
                alt={ad.alt}
                loading="lazy"
                decoding="async"
                // ensure crisp logos: avoid layout shift by reserving height via container
              />
            );
            return ad.href ? (
              <a key={`${ad.id}-${i}`} href={ad.href} className="imgmarq-item" aria-label={ad.alt}>
                {Inner}
              </a>
            ) : (
              <span key={`${ad.id}-${i}`} className="imgmarq-item">{Inner}</span>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
