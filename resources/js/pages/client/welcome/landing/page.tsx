import { Head, Link, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { SharedData } from "@/types";
import { Section1 } from "./section-1";
import { Section2 } from "./section-2";
import { Section9 } from "./section-9";
import { Section8 } from "./section-8";
import { Section7 } from "./section-7";
import { Section6 } from "./section-6";
import { Section5 } from "./section-5";
import { Section4 } from "./section-4";
import { Section3 } from "./section-3";

// 👇 add this import
import { Reveal } from "@/components/anim";

export default function LandingPage() {
  const { auth } = usePage<SharedData>().props;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-white dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Head title="Rafiki-Motors — Plateforme de gros & détail" />

      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-neutral-950/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-yellow-500 text-white dark:bg-gold-400 dark:text-yellow-500 grid place-items-center font-bold">
              <img src="/images/logo-rafiki-motors-2.png" />
            </div>
            <span className="font-semibold tracking-tight">Rafiki-Motors</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
            <a href="#why" className="hover:text-neutral-900 dark:hover:text-neutral-100">Pourquoi nous</a>
            <a href="#stats" className="hover:text-neutral-900 dark:hover:text-neutral-100">Statistiques</a>
            <a href="#partners" className="hover:text-neutral-900 dark:hover:text-neutral-100">Partenaires</a>
            <a href="#faq" className="hover:text-neutral-900 dark:hover:text-neutral-100">FAQ</a>
            <a href="#contact" className="hover:text-neutral-900 dark:hover:text-neutral-100">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            {auth.user ? (
              <Link href={route("client.parts.page")}>
                <Button variant="ghost" className="hidden sm:inline-flex rounded-xl">Accéder au tableau de bord</Button>
              </Link>
            ) : (
              <>
                <Link href={route("login")}><Button variant="ghost" className="hidden sm:inline-flex rounded-xl">Se connecter</Button></Link>
                <Link href={route("register")}><Button className="rounded-xl">Créer un compte</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <Reveal amount={0.3}>
        <Section1 />
      </Reveal>

      {/* Mosaic / Hero Grid */}
      <Reveal delay={0.05} amount={0.25}>
        <Section2 />
      </Reveal>

      {/* WHY CHOOSE US */}
      <Reveal delay={0.08} amount={0.2}>
        <section id="why">
          <Section3 />
        </section>
      </Reveal>

      {/* STATS */}
      <Reveal delay={0.1} amount={0.25}>
        <section id="stats">
          <Section4 />
        </section>
      </Reveal>

      {/* PARTNERS */}
      <Reveal delay={0.12} amount={0.25}>
        <section id="partners">
          <Section5 />
        </section>
      </Reveal>

      {/* COMMUNITY */}
      <Reveal delay={0.14} amount={0.25}>
        <Section6 />
      </Reveal>

      {/* FAQ */}
      <Reveal delay={0.16} amount={0.25}>
        <section id="faq">
          <Section7 />
        </section>
      </Reveal>

      {/* CTA BAND */}
      <Reveal delay={0.18} amount={0.25}>
        <Section8 />
      </Reveal>

      {/* CONTACT */}
      <Reveal delay={0.2} amount={0.25}>
        <section id="contact">
          <Section9 />
        </section>
      </Reveal>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-neutral-500 dark:text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-yellow-500 text-white dark:bg-gold-400 dark:text-yellow-500 grid place-items-center font-bold">
              <img src="/images/logo-rafiki-motors-2.png" />
            </div>
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-100">Rafiki-Motors</div>
              <div className="text-xs">Les pièces en toute simplicité.</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href={route("terms")}>Conditions générales</Link>
            <Link href={route("privacy")}>Politique de confidentialité</Link>
            <Link href={route("register")}>Créer un compte</Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 text-xs text-neutral-500">
          © {new Date().getFullYear()} Rafiki-Motors. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
