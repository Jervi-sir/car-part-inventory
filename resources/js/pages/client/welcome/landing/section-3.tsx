import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Truck, Warehouse, WrenchIcon } from 'lucide-react';
import React from 'react';

export const Section3 = () => {
  return (
    <>
      <section id="why" className="py-16 bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Pourquoi choisir Rafiki-Motors&nbsp;?</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">La crédibilité d’un distributeur automobile, la rapidité d’une place de marché moderne.</p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueCard icon={<ShieldCheck className="h-5 w-5" />} title="Acheteurs vérifiés" desc="Accès restreint pour maintenir des prix équitables et un stock fiable." />
            <ValueCard icon={<Warehouse className="h-5 w-5" />} title="Retrait en entrepôt" desc="Réservez en ligne et retirez localement quand cela vous convient." />
            <ValueCard icon={<Truck className="h-5 w-5" />} title="Livraison nationale" desc="Transporteurs fiables partout en Algérie avec expédition rapide." />
            <ValueCard icon={<WrenchIcon className="h-5 w-5" />} title="Références OEM" desc="Recoupez les références OEM, aftermarket et codes EAN/UPC." />
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
          <span className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-muted text-white items-center justify-center shadow">
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

