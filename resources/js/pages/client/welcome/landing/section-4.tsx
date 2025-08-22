import React from 'react';

export const Section4 = () => {
  return (
    <>
       <section id="stats" className="py-20 bg-white dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center">Les chiffres ne mentent pas</h3>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400 text-center">Nous grandissons avec les mécaniciens, détaillants et passionnés d’automobile en Algérie.</p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
            <Stat big="500+" small="Acheteurs vérifiés" />
            <Stat big="12" small="Entrepôts & points de retrait" />
            <Stat big="2K+" small="Clients servis" />
            <Stat big="50K+" small="Références de pièces" />
          </div>
        </div>
      </section>
    </>
  );
};

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-extrabold text-yellow-600">{big}</div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{small}</p>
    </div>
  );
}
