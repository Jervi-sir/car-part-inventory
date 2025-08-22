import { Head, Link, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  Check,
  Factory,
  Gauge,
  ShieldCheck,
  Truck,
  Warehouse,
  Wrench,
  Mail,
  Phone,
  MapPin,
  Clock,
  Facebook,
  Youtube,
  Instagram,
  Twitter,
  Shield,
} from "lucide-react";
import * as React from "react";
import { SharedData } from "@/types";

export default function LandingPage() {
  const { auth } = usePage<SharedData>().props;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-white dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Head title="Rafiki-Motors — Wholesale & Retail Platform" />

      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-neutral-950/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 grid place-items-center font-bold">RM</div>
            <span className="font-semibold tracking-tight">Rafiki-Motors</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
            <a href="#why" className="hover:text-neutral-900 dark:hover:text-neutral-100">Why us</a>
            <a href="#stats" className="hover:text-neutral-900 dark:hover:text-neutral-100">Stats</a>
            <a href="#partners" className="hover:text-neutral-900 dark:hover:text-neutral-100">Partners</a>
            <a href="#faq" className="hover:text-neutral-900 dark:hover:text-neutral-100">FAQ</a>
            <a href="#contact" className="hover:text-neutral-900 dark:hover:text-neutral-100">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            {auth.user ? (
              <Link href={route("client.parts.page")}>
                <Button variant="ghost" className="hidden sm:inline-flex rounded-xl">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href={route("login")}><Button variant="ghost" className="hidden sm:inline-flex rounded-xl">Sign in</Button></Link>
                <Link href={route("register")}><Button className="rounded-xl">Create account</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-black">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-10 dark:opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm tracking-wide">🚗 B2B • B2C • Algeria</Badge>
            <h1 className="mt-6 text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                Algeria’s #1 Car Parts Inventory
              </span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400 max-w-lg">
              Instant access to verified suppliers, live stock & pricing, and nationwide delivery.
              Trusted by mechanics, retailers, and car enthusiasts across DZ.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {auth.user ? (
                <Link href={route("client.parts.page")}>
                  <Button size="lg" className="rounded-2xl shadow-lg hover:scale-105 transition">Browse Stock</Button>
                </Link>
              ) : (
                <>
                  <Link href={route("register")}>
                    <Button size="lg" className="rounded-2xl shadow-lg hover:scale-105 transition">Unlock Free Access</Button>
                  </Link>
                  <Link href={route("login")}>
                    <Button size="lg" variant="outline" className="rounded-2xl hover:scale-105 transition">Sign in</Button>
                  </Link>
                </>
              )}
            </div>
            <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400">⚡ Fast approval. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ValueCard
              icon={<Shield className="h-6 w-6" />}
              title="Verified Buyers"
              desc="We onboard trusted businesses and retail buyers to keep pricing fair."
            />
            <ValueCard
              icon={<Warehouse className="h-6 w-6" />}
              title="Local Warehouse"
              desc="Reserve online & pick up at your convenience."
            />
            <ValueCard
              icon={<Truck className="h-6 w-6" />}
              title="Nationwide Delivery"
              desc="Reliable shipping across Algeria via top couriers."
            />
            <ValueCard
              icon={<Check className="h-6 w-6" />}
              title="OEM References"
              desc="Cross-match OEM, aftermarket, and EAN/UPC codes instantly."
            />
          </div>
        </div>
      </section>
      {/* HERO — mosaic grid inspired by shadcn blocks */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          {/* Mosaic cards */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-[140px] gap-4">
            {/* Big image / brand feel */}
            <MosaicCard className="lg:col-span-3 lg:row-span-2 bg-[url('/images/hero-1.jpg')] bg-cover bg-center text-white">
              <div className="absolute inset-0 rounded-2xl bg-black/20" />
              <div className="relative z-10 p-4 sm:p-6">
                <p className="text-sm sm:text-base font-semibold">Experience Parts Excellence.</p>
              </div>
            </MosaicCard>

            {/* USP copy */}
            <MosaicCard className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Build confidently with live stock & modern search.</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600 dark:text-neutral-400">
                Cross-reference OEM, aftermarket & EAN/UPC. Filter by vehicle & fitment. Reserve instantly.
              </CardContent>
            </MosaicCard>

            {/* Stat */}
            <MosaicCard className="lg:col-span-1 items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-extrabold">95%</div>
                <div className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">Approval within 24h</div>
              </div>
            </MosaicCard>

            {/* Price / CTA */}
            <MosaicCard className="lg:col-span-2 items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-extrabold">$0</div>
                <div className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">Free account • No fees</div>
                {!auth.user && (
                  <div className="mt-3">
                    <Link href={route("register")}><Button size="sm" className="rounded-xl">Create account</Button></Link>
                  </div>
                )}
              </div>
            </MosaicCard>

            {/* Small logo / brand block */}
            <MosaicCard className="lg:col-span-1 items-center justify-center">
              <img src="/images/logo-mark.svg" alt="Rafiki-Motors" className="h-10 opacity-80" />
            </MosaicCard>

            {/* Showcase image */}
            <MosaicCard className="lg:col-span-2 bg-[url('/images/hero-2.jpg')] bg-cover bg-center text-white">
              <div className="absolute inset-0 rounded-2xl bg-black/30" />
              <div className="relative z-10 p-4">
                <div className="text-sm font-semibold">Rapid fulfillment</div>
                <div className="text-xs opacity-90">Pickup or nationwide delivery</div>
              </div>
            </MosaicCard>

            {/* Social proof */}
            <MosaicCard className="lg:col-span-2 items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-extrabold">300+</div>
                <div className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">Garages & retailers onboard</div>
              </div>
            </MosaicCard>

            {/* Icon block */}
            <MosaicCard className="lg:col-span-2 items-center justify-center">
              <img src="/images/cube.svg" alt="Cube" className="h-10 opacity-80" />
            </MosaicCard>
          </div>

          {/* Partners strip */}
          <div className="mt-10 flex flex-wrap items-center gap-8 opacity-80" aria-label="Partner brands">
            {["/logos/mann.png", "/logos/febi.png", "/logos/swag.png", "/logos/hella.png", "/logos/wix.png"].map((src, i) => (
              <img key={i} src={src} alt="Partner" className="h-8 grayscale hover:grayscale-0 transition" />
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section id="why" className="py-16 bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Why Choose Rafiki-Motors?</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Credibility of an automotive distributor, speed of a modern marketplace.</p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueCard icon={<ShieldCheck className="h-5 w-5" />} title="Verified buyers" desc="Access gated to keep pricing fair & stock accurate." />
            <ValueCard icon={<Warehouse className="h-5 w-5" />} title="Warehouse pickup" desc="Reserve online and collect locally when it suits you." />
            <ValueCard icon={<Truck className="h-5 w-5" />} title="Nationwide delivery" desc="Reliable couriers across DZ with quick dispatch." />
            <ValueCard icon={<Wrench className="h-5 w-5" />} title="OEM references" desc="Cross-reference OEM, aftermarket & EAN/UPC codes." />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="py-20 bg-white dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center">Numbers don’t lie</h3>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400 text-center">Growing with Algeria’s mechanics, retailers, and enthusiasts.</p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
            <Stat big="500+" small="Verified buyers" />
            <Stat big="12" small="Warehouses & pickup points" />
            <Stat big="2K+" small="Clients served" />
            <Stat big="50K+" small="Part references" />
          </div>
        </div>
      </section>

      {/* CERTIFICATIONS / PARTNERS GRID */}
      <section id="partners" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950">
              <CardHeader>
                <CardTitle className="text-2xl">Our certifications say it all.</CardTitle>
              </CardHeader>
              <CardContent className="text-neutral-600 dark:text-neutral-400">
                We work with global brands and vetted local suppliers to ensure fitment, quality, and warranty support.
                <div className="mt-5">
                  <Link href={auth.user ? route("client.parts.page") : route("register")}>
                    <Button className="rounded-xl">Get in touch <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950">
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {[
                    "/logos/swag.png", "/logos/febi.png", "/logos/ina.png",
                    "/logos/mann.png", "/logos/hella.png", "/logos/wix.png",
                  ].map((src, i) => (
                    <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 grid place-items-center p-4">
                      <img src={src} alt="Brand" className="h-8 object-contain grayscale hover:grayscale-0 transition" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="py-16 bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center">Join our community</h3>
          <p className="text-center mt-2 text-neutral-600 dark:text-neutral-400">Follow updates, watch installs, and see behind-the-scenes.</p>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CommunityCard icon={<Facebook className="h-5 w-5" />} title="Join our group" desc="Share ideas, get help, and connect." cta="Follow us on Facebook" href="#" />
            <CommunityCard icon={<Youtube className="h-5 w-5" />} title="Watch our channel" desc="Guides, unboxings, fitment tips." cta="Follow us on YouTube" href="#" />
            <CommunityCard icon={<Twitter className="h-5 w-5" />} title="Get quick updates" desc="News & quick bites from the team." cta="Follow us on X" href="#" />
            <CommunityCard icon={<Instagram className="h-5 w-5" />} title="See our gallery" desc="Latest builds & stories." cta="Follow us on Instagram" href="#" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center">FAQs</h3>
          <Card className="mt-6 rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950">
            <CardContent className="p-2 sm:p-4">
              <Accordion type="single" collapsible className="w-full">
                <FAQItem q="Why do I need an account?" a="We operate tiered pricing and live stock; verified access keeps data accurate and fair." />
                <FAQItem q="Is there a fee?" a="No. Creating an account is free. You only pay for placed orders." />
                <FAQItem q="How long does approval take?" a="Most accounts are approved the same day during business hours." />
                <FAQItem q="Can I pick up from a warehouse?" a="Yes. Reserve online and select pickup or delivery at checkout." />
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="py-12 bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-xl font-semibold">Ready to unlock wholesale access?</h4>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Live stock, verified pricing, OEM cross-refs, and fast nationwide delivery.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-neutral-700 dark:text-neutral-300">
            <li>Easy integration</li>
            <li>24/7 support</li>
            <li>Scalable performance</li>
            <li>Thousands of references</li>
          </div>
          <Link href={auth.user ? route("client.parts.page") : route("register")}>
            <Button size="lg" className="rounded-xl">Get started <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-16">
        <div className="mx-auto max-w-7xl ">
          <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 ">
            <CardContent className="p-6 sm:p-10 grid lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-3">
                  <img src="/images/logo-mark.svg" className="h-10" alt="Rafiki-Motors" />
                  <span className="text-sm tracking-widest text-neutral-500">CARPARTS.DZ</span>
                </div>
                <h4 className="mt-6 text-2xl font-semibold">Contact us</h4>

                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex items-center gap-3"><Mail className="h-4 w-4" /><span>hello@carparts.dz</span></li>
                  <li className="flex items-center gap-3"><Phone className="h-4 w-4" /><span>+213 561 000 000</span></li>
                  <li className="flex items-center gap-3"><MapPin className="h-4 w-4" /><span>Dely Ibrahim, Algiers</span></li>
                  <li className="flex items-center gap-3"><Clock className="h-4 w-4" /><span>Sun–Thu, 9am–5pm</span></li>
                </ul>
              </div>

              <form className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input placeholder="Name" />
                  <Input placeholder="Phone" />
                </div>
                <Input placeholder="Email" type="email" />
                <Textarea placeholder="Your message" className="min-h-[120px]" />
                <div className="flex justify-end">
                  <Button className="rounded-xl">Contact us</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-neutral-500 dark:text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 grid place-items-center font-bold">RM</div>
            <div>
              <div className="font-medium text-neutral-800 dark:text-neutral-100">Rafiki-Motors</div>
              <div className="text-xs">Components made easy.</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href={route("terms")}>Terms & Conditions</Link>
            <Link href={route("privacy")}>Privacy Policy</Link>
            <Link href={route("register")}>Create account</Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 text-xs text-neutral-500">
          © {new Date().getFullYear()} Rafiki-Motors. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------- PARTS --------------------------------- */

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

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-extrabold text-yellow-600">{big}</div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{small}</p>
    </div>
  );
}

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

function FAQItem({ q, a }: { q: string; a: string }) {
  const id = q.toLowerCase().replace(/\s+/g, "-");
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="px-3">{q}</AccordionTrigger>
      <AccordionContent className="px-3 text-neutral-600 dark:text-neutral-400">{a}</AccordionContent>
    </AccordionItem>
  );
}
