import { Button } from '@/components/ui/button';
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import React from 'react';

export const Section8 = () => {
  const { auth } = usePage<SharedData>().props;


  return (
    <>
      <section className="py-12 bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-xl font-semibold">Prêt à débloquer l’accès grossiste&nbsp;?</h4>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Stock en temps réel, prix vérifiés, recoupement OEM et livraison nationale rapide.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-neutral-700 dark:text-neutral-300">
            <li>Intégration facile</li>
            <li>Assistance 24/7</li>
            <li>Performance évolutive</li>
            <li>Des milliers de références</li>
          </div>
          <Link href={auth.user ? route("client.parts.page") : route("register")}>
            <Button size="lg" className="rounded-xl">Commencer <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </section>
    </>
  );
};