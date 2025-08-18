import { Head, Link, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Shield, Truck, Warehouse } from "lucide-react";
import { SharedData } from "@/types";

export default function LandingPage() {
  const { auth } = usePage<SharedData>().props;
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-white dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Head title="CarParts DZ — Wholesale & Retail Platform" />

      {/* Public-only Nav */}
      <header className="sticky top-0 z-40  dark:bg-neutral-950/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 grid place-items-center font-bold">CP</div>
            <span className="font-semibold tracking-tight">CarParts DZ</span>
          </div>
          <div className="flex items-center gap-3">
            {auth.user
              ?
              <>
                <Link href={route("client.parts.page")}> <Button variant="ghost" className="hidden sm:inline-flex">Go To Dashboard</Button> </Link>
              </>
              :
              <>
                <Link href={route("login")}> <Button variant="ghost" className="hidden sm:inline-flex">Sign in</Button> </Link>
                <Link href={route("register")}> <Button className="rounded-xl">Create account</Button> </Link>
              </>
            }
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="secondary" className="rounded-full px-3 py-1">B2B • B2C • DZ</Badge>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              The car parts platform for Algeria.
            </h1>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400 text-lg">
              One account to browse live stock & prices, request bulk quotes, and order for pickup or delivery nationwide. Access is members-only to protect pricing and availability.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {auth.user
                ?<>
                  <Link href={route("client.parts.page")}> <Button variant="secondary" className="hidden sm:inline-flex">Go To Dashboard</Button> </Link>
                </>
                :<>
                  <Link href={route("register")}>
                    <Button size="lg" className="rounded-xl">Create a free account</Button>
                  </Link>
                  <Link href={route("login")}>
                    <Button size="lg" variant="outline" className="rounded-xl">Sign in</Button>
                  </Link>
                </>
              }
            </div>
            <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-400">No credit card required. Approval usually same day.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ValueCard
              icon={<Shield className="h-5 w-5" />}
              title="Verified buyers"
              desc="We onboard business and retail buyers to keep pricing fair and stock accurate."
            />
            <ValueCard
              icon={<Warehouse className="h-5 w-5" />}
              title="Warehouse pickup"
              desc="Reserve online and pick up from our local warehouse."
            />
            <ValueCard
              icon={<Truck className="h-5 w-5" />}
              title="Nationwide delivery"
              desc="Reliable couriers and post options across DZ."
            />
            <ValueCard
              icon={<Check className="h-5 w-5" />}
              title="OEM references"
              desc="Cross‑reference OEM, aftermarket, and EAN/UPC codes."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { step: 1, title: "Create your account", desc: "Tell us if you're retail or business. We'll review quickly." },
              { step: 2, title: "Get access", desc: "Browse live stock, pricing tiers, and fitments by vehicle." },
              { step: 3, title: "Order & receive", desc: "Pickup from warehouse or select delivery—simple and fast." },
            ].map((s) => (
              <li key={s.step} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Step {s.step}</div>
                <div className="mt-1 font-semibold">{s.title}</div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{s.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-row justify-center items-center gap-4 pt-4">
             {auth.user
                ?<>
                  <Link href={route("client.parts.page")}> <Button className="hidden sm:inline-flex">Go To Dashboard</Button> </Link>
                </>
                :<>
                  <Link href={route("register")}>
                    <Button size="lg" className="rounded-xl">Create a free account</Button>
                  </Link>
                  <Link href={route("login")}>
                    <Button size="lg" variant="outline" className="rounded-xl">Sign in</Button>
                  </Link>
                </>
              }
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-semibold">FAQ</h3>
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="q1">
              <AccordionTrigger>Why do I need an account?</AccordionTrigger>
              <AccordionContent>We work with tiered pricing and live stock; access is limited to keep data accurate and fair for verified buyers.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>Is there a fee?</AccordionTrigger>
              <AccordionContent>No. Creating an account is free. You only pay for orders you place.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>How long does approval take?</AccordionTrigger>
              <AccordionContent>Most accounts are approved the same day (business hours).</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-neutral-500 dark:text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} CarParts DZ. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href={route("terms")}>Terms</Link>
            <Link href={route("privacy")}>Privacy</Link>
            <Link href={route("register")}>Create account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ValueCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{desc}</p>
      </CardContent>
    </Card>
  );
}
