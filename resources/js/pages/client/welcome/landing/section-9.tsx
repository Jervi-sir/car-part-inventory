import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import React from 'react';

export const Section9 = () => {
  return (
    <>
      <section id="contact" className="py-16">
        <div className="mx-auto max-w-7xl ">
          <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 ">
            <CardContent className="p-6 sm:p-10 grid lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3">
                  <img src="/images/logo-mark.svg" className="h-10" alt="Rafiki-Motors" />
                  <span className="text-sm tracking-widest text-neutral-500">Rafiki-Motors.DZ</span>
                </div>
                <h4 className="mt-6 text-2xl font-semibold">Contactez-nous</h4>

                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex items-center gap-3"><Mail className="h-4 w-4" /><span>hello@.dz</span></li>
                  <li className="flex items-center gap-3"><Phone className="h-4 w-4" /><span>+213 561 000 000</span></li>
                  <li className="flex items-center gap-3"><MapPin className="h-4 w-4" /><span>Dely Ibrahim, Alger</span></li>
                  <li className="flex items-center gap-3"><Clock className="h-4 w-4" /><span>Dim–Jeu, 9h–17h</span></li>
                </ul>
              </div>

              <form className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input placeholder="Nom" />
                  <Input placeholder="Téléphone" />
                </div>
                <Input placeholder="Email" type="email" />
                <Textarea placeholder="Votre message" className="min-h-[120px]" />
                <div className="flex justify-end">
                  <Button className="rounded-xl">Nous contacter</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};