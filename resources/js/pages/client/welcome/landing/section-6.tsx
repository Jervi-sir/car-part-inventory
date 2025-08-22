import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import React from 'react';

export const Section6 = () => {
  return (
    <>
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center">Rejoignez notre communauté</h3>
          <p className="text-center mt-2 text-neutral-600 dark:text-neutral-400">Suivez les nouveautés, regardez les installations et découvrez les coulisses.</p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CommunityCard icon={<Facebook className="h-5 w-5" />} title="Rejoignez notre groupe" desc="Partagez vos idées, obtenez de l’aide et échangez." cta="Suivez-nous sur Facebook" href="#" />
            <CommunityCard icon={<Youtube className="h-5 w-5" />} title="Regardez notre chaîne" desc="Guides, unboxings, conseils de montage." cta="Suivez-nous sur YouTube" href="#" />
            <CommunityCard icon={<Twitter className="h-5 w-5" />} title="Mises à jour rapides" desc="Infos & brèves de l’équipe." cta="Suivez-nous sur X" href="#" />
            <CommunityCard icon={<Instagram className="h-5 w-5" />} title="Découvrez notre galerie" desc="Dernières réalisations & stories." cta="Suivez-nous sur Instagram" href="#" />
          </div>
        </div>
      </section>
    </>
  );
};


function CommunityCard({
  icon,
  title,
  desc,
  cta,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  href: string;
}) {
  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
        <p>{desc}</p>
        <div className="mt-4">
          <a href={href} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
            {cta} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

