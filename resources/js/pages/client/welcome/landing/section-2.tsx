import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

export const Section2 = () => {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          {/* Mosaic cards */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-[140px] gap-4">
            {/* USP copy */}
            <MosaicCard className="lg:col-span-2 flex flex-col gap-2 justify-center">
              <CardHeader className="">
                <CardTitle className="text-lg">Construisez en confiance avec stock live & recherche moderne.</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
                Recoupez OEM, aftermarket & EAN/UPC. Filtrez par véhicule et compatibilité. Réservez instantanément.
              </CardContent>
            </MosaicCard>
            {/* Stat */}
            <MosaicCard className="lg:col-span-1 items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-extrabold">95%</div>
                <div className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">Approbation sous 24&nbsp;h</div>
              </div>
            </MosaicCard>
            {/* Big image / brand feel */}
            <MosaicCard className="lg:col-span-3 lg:row-span-2 bg-[url('/images/car-kits-2.png')] bg-contain bg-center text-white bg-white">
              <div className="absolute inset-0 rounded-2xl bg-black/20" />
              <div className="relative z-10 p-4 sm:p-6">
                {/* <p className="text-sm sm:text-base font-semibold">L’excellence des pièces.</p> */}
              </div>
            </MosaicCard>

            {/* Social proof */}
            <MosaicCard className="lg:col-span-2 items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-extrabold">300+</div>
                <div className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">Garages et détaillants inscrits</div>
              </div>
            </MosaicCard>
            {/* Small logo / brand block */}
            <MosaicCard className="lg:col-span-1 items-center justify-center p-2 py-4">
              <img src="/images/theme-blue/logo-rafiki-motors-1.png" alt="Rafiki-Motors" className="opacity-80" />
            </MosaicCard>
          </div>

          {/* Partners strip */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-8 opacity-80" aria-label="Marques partenaires">
            {[
              "/images/car-brands/mercedes-benz-2.png", "/images/car-brands/bmw.png", "/images/car-brands/fiat.png",
              "/images/car-brands/hyundai.png", "/images/car-brands/volvo.png", "/images/car-brands/peugeot.png",
            ].map((src, i) => (
              <img key={i} src={src} alt="Partenaire" className="h-20 hover:grayscale-0 transition" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};


function MosaicCard({
  children,
  className = "",
}: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0 overflow-hidden flex ${className}`}>
      {children ?? <div className="p-4" />}
    </div>
  );
}

