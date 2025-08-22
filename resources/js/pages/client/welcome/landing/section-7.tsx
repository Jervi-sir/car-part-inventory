import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

export const Section7 = () => {
  return (
    <>
       <section id="faq" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center">FAQ</h3>
          <Card className="mt-6 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950">
            <CardContent className="p-2 sm:p-4">
              <Accordion type="single" collapsible className="w-full">
                <FAQItem q="Pourquoi ai-je besoin d’un compte ?" a="Nous appliquons des tarifs par paliers et un stock en temps réel ; l’accès vérifié garantit des données exactes et équitables." />
                <FAQItem q="Y a-t-il des frais ?" a="Non. La création d’un compte est gratuite. Vous ne payez que les commandes passées." />
                <FAQItem q="Combien de temps prend la validation ?" a="La plupart des comptes sont approuvés le jour même pendant les heures ouvrables." />
                <FAQItem q="Puis-je récupérer en entrepôt ?" a="Oui. Réservez en ligne et choisissez le retrait ou la livraison lors du paiement." />
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

function FAQItem({ q, a }: { q: string; a: string }) {
  const id = q.toLowerCase().replace(/\s+/g, "-");
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="px-3">{q}</AccordionTrigger>
      <AccordionContent className="px-3 text-neutral-600 dark:text-neutral-400">{a}</AccordionContent>
    </AccordionItem>
  );
}
