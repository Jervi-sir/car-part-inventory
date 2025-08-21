import React from "react";
import { usePage } from "@inertiajs/react";
import { Card } from "../ui/card";

type FooterAd = {
  id: number | string;
  href?: string;
  src: string;
  alt: string;
};

type AdsMap = Record<string, FooterAd[]>;

export function AdGridFooter({
  items,
  placement = "footer_grid",
  title = "Sponsored",
  className = "",
}: {
  items?: FooterAd[];
  placement?: string;
  title?: string;
  className?: string;
}) {
  const { props } = usePage<{ ads?: AdsMap }>();
  const fromInertia = (props?.ads && (props.ads as any)[placement]) || [];
  const data: FooterAd[] = items?.length ? items : fromInertia;

  if (!data?.length) return null;

  return (
    <Card className={`p-3 md:p-4 mt-4 ${className}`}>
      {/* Optional heading */}
      {title && <div className="text-sm font-medium mb-2 text-muted-foreground">{title}</div>}

      {/* Responsive grid: 3 on mobile, 6 on md+, 8 on xl */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-3">
        {data.map((ad) => {
          const Img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.src}
              alt={ad.alt}
              loading="lazy"
              decoding="async"
              className="w-full h-12 object-contain"
            />
          );
          return ad.href ? (
            <a
              key={ad.id}
              href={ad.href}
              className="group rounded border bg-background hover:bg-muted/50 transition flex items-center justify-center p-2"
              aria-label={ad.alt}
            >
              {Img}
            </a>
          ) : (
            <div
              key={ad.id}
              className="rounded border bg-background flex items-center justify-center p-2"
            >
              {Img}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
