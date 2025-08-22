import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Check, Shield, Truck, Warehouse } from 'lucide-react';
import React from 'react';

export const Section1 = () => {
  const { auth } = usePage<SharedData>().props;
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-black">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10 dark:opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm tracking-wide">🚗 B2B • B2C • Algérie</Badge>
            <h1 className="mt-6 text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                ’The Best’ des pièces auto en Algérie
              </span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400 max-w-lg">
              Accès instantané à des fournisseurs vérifiés, stock et prix en temps réel, et livraison nationale.
              Plébiscité par les mécaniciens, détaillants et passionnés à travers l’Algérie.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {auth.user ? (
                <Link href={route("client.parts.page")}>
                  <Button size="lg" className="rounded-2xl shadow-lg hover:scale-105 transition">Parcourir le stock</Button>
                </Link>
              ) : (
                <>
                  <Link href={route("register")}>
                    <Button size="lg" className="rounded-2xl shadow-lg hover:scale-105 transition">Accéder gratuitement</Button>
                  </Link>
                  <Link href={route("login")}>
                    <Button size="lg" variant="outline" className="rounded-2xl hover:scale-105 transition">Se connecter</Button>
                  </Link>
                </>
              )}
            </div>
            <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400">⚡ Validation rapide. Aucune carte bancaire requise.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ValueCard
              icon={<Shield className="h-6 w-6" />}
              title="Acheteurs vérifiés"
              desc="Nous intégrons des entreprises et des particuliers fiables pour garder des prix justes."
            />
            <ValueCard
              icon={<Warehouse className="h-6 w-6" />}
              title="Entrepôt local"
              desc="Réservez en ligne et retirez quand cela vous convient."
            />
            <ValueCard
              icon={<Truck className="h-6 w-6" />}
              title="Livraison nationale"
              desc="Expédition fiable partout en Algérie via des transporteurs de confiance."
            />
            <ValueCard
              icon={<Check className="h-6 w-6" />}
              title="Références OEM"
              desc="Recoupez instantanément OEM, aftermarket et codes EAN/UPC."
            />
          </div>
        </div>
      </section>
    </>
  );
};

function ValueCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md hover:scale-[1.02] transition">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base font-semibold">
          <span className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 text-white items-center justify-center shadow">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
      </CardContent>
    </Card>
  );
}
