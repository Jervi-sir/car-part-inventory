import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import React from 'react';

export const Section5 = () => {
  const { auth } = usePage<SharedData>().props;
  return (
    <>
      <section id="partners" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950">
              <CardHeader>
                <CardTitle className="text-2xl">Nos certifications parlent d’elles-mêmes.</CardTitle>
              </CardHeader>
              <CardContent className="text-neutral-600 dark:text-neutral-400">
                Nous travaillons avec des marques mondiales et des fournisseurs locaux vérifiés pour garantir la compatibilité, la qualité et le support de garantie.
                <div className="mt-5">
                  <Link href={auth.user ? route("client.parts.page") : route("register")}>
                    <Button className="rounded-xl">Nous contacter <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            <Card className={cn(
              "md:col-span-2 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950",
              "flex flex-row justify-center items-center px-4"
            )}>
              {[
                "/images/febi-bilstein.png", "/images/hella.png", "/images/ina-ina.png", "/images/mann-filter.png", "/images/swag.svg",
              ].map((src, i) => (
                <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 grid place-items-center p-4">
                  <img src={src} alt="Marque" className="h-20 object-contain grayscale hover:grayscale-0 transition" />
                </div>
              ))}
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};