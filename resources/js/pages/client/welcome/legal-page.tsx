import { Head, Link } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


export type LegalPageProps = {
  type: "terms" | "privacy";
  updatedAt?: string; // ISO date string e.g. "2025-08-18"
  company?: {
    name: string;
    country?: string; // e.g. "Algeria"
    legalEmail?: string; // e.g. "support@example.com"
    address?: string; // optional physical address
  };
};

export default function LegalPage({ type, updatedAt, company }: LegalPageProps) {
  const metaTitle = type === "terms" ? "Terms of Service" : "Privacy Policy";
  const updated = updatedAt ?? new Date().toISOString().slice(0, 10);
  const info = {
    name: company?.name ?? "CarParts DZ",
    country: company?.country ?? "Algeria",
    email: company?.legalEmail ?? "support@carpartsdz.example",
    address: company?.address ?? "—",
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Head title={metaTitle} />

      <header className="sticky top-0 z-40  dark:bg-neutral-950/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 grid place-items-center font-bold">CP</div>
            <span className="font-semibold tracking-tight">CarParts DZ</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <Badge variant="secondary" className="rounded-full">{metaTitle}</Badge>
            <div className="flex items-center gap-3">
              <Link href={route("login")}> <Button variant="ghost" className="hidden sm:inline-flex">Sign in</Button> </Link>
              <Link href={route("register")}> <Button className="rounded-xl">Create account</Button> </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-2xl">{metaTitle}</CardTitle>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Last updated: {updated}</div>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            {type === "terms" ? <TermsBody info={info} /> : <PrivacyBody info={info} />}
          </CardContent>
        </Card>
      </main>

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

function TermsBody({ info }: { info: { name: string; country: string; email: string; address: string } }) {
  return (
    <div className="space-y-6">
      <p>
        These Terms of Service ("Terms") govern your access to and use of {info.name}'s platform for browsing and
        purchasing automotive parts and related services (the "Service"). By creating an account or using the Service, you
        agree to these Terms.
      </p>

      <h3>1. Eligibility & Accounts</h3>
      <p>
        You must be at least 18 years old. You are responsible for your account credentials and for all activity under your
        account. We may require additional verification for business (B2B) accounts.
      </p>

      <h3>2. Access & Availability</h3>
      <p>
        Access to live prices, stock and ordering is limited to registered users. We may modify or discontinue features at
        any time to maintain availability and accuracy.
      </p>

      <h3>3. Pricing & Orders</h3>
      <ul>
        <li>Prices are shown in DZD unless stated otherwise; tiered pricing (retail / demi-gros / gros) may apply per item.</li>
        <li>Submitting an order constitutes an offer to purchase; we may accept or reject your order at our discretion.</li>
        <li>For bulk orders, quotes may have validity periods and stock constraints.</li>
      </ul>

      <h3>4. Shipping, Pickup & Risk</h3>
      <ul>
        <li>Delivery options include courier or post; alternatively, you may select warehouse pickup where offered.</li>
        <li>Risk of loss transfers on delivery to the carrier or upon pickup handover.</li>
      </ul>

      <h3>5. Returns & Warranty</h3>
      <ul>
        <li>Returns are subject to prior authorization and item condition. Electrical items and special orders may be non‑returnable.</li>
        <li>OEM/aftermarket parts carry their respective manufacturer warranties, if any.</li>
      </ul>

      <h3>6. Prohibited Uses</h3>
      <p>
        You agree not to misuse the Service, including scraping, reselling access, posting unlawful content, or interfering
        with systems.
      </p>

      <h3>7. Intellectual Property</h3>
      <p>
        All content, trademarks and data on the Service are owned by {info.name} or licensors. You receive a limited,
        non‑exclusive license to use the Service.
      </p>

      <h3>8. Liability</h3>
      <p>
        To the fullest extent permitted by law, {info.name} is not liable for indirect, incidental or consequential damages
        arising from your use of the Service.
      </p>

      <h3>9. Governing Law</h3>
      <p>
        These Terms are governed by the laws of {info.country}. Disputes will be handled by the competent courts where we
        are established, unless mandatory consumer protections provide otherwise.
      </p>

      <h3>10. Contact</h3>
      <p>
        Questions about these Terms? Contact us at {info.email}. Address: {info.address}
      </p>

      <Separator />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        This is a general template and may need adjustments to meet specific legal requirements in your jurisdiction or
        business model.
      </p>
    </div>
  );
}

function PrivacyBody({ info }: { info: { name: string; country: string; email: string; address: string } }) {
  return (
    <div className="space-y-6">
      <p>
        This Privacy Policy explains how {info.name} collects, uses and protects personal information when you create an
        account and use our Service.
      </p>

      <h3>1. Data We Collect</h3>
      <ul>
        <li>Account data: name, email, phone (optional), password hash.</li>
        <li>Shipping details: recipient, phone, address, country.</li>
        <li>Order data: items, quantities, amounts, delivery method, notes.</li>
        <li>Technical data: device/browser info, IP address, and usage logs for security.</li>
      </ul>

      <h3>2. How We Use Data</h3>
      <ul>
        <li>To create and manage your account and authenticate access.</li>
        <li>To process orders, deliveries/pickups, returns and support.</li>
        <li>To prevent fraud and ensure platform security.</li>
        <li>To improve our catalog and user experience.</li>
      </ul>

      <h3>3. Legal Bases</h3>
      <p>
        We process data to perform our contract with you (orders, account), to comply with legal obligations (tax, invoices),
        and based on our legitimate interests (security, service improvement). Where required, we rely on your consent.
      </p>

      <h3>4. Sharing</h3>
      <ul>
        <li>Logistics providers and couriers for delivery.</li>
        <li>Payment processors for transactions.</li>
        <li>IT/service vendors under confidentiality and data protection obligations.</li>
        <li>Authorities when legally required.</li>
      </ul>

      <h3>5. Retention</h3>
      <p>
        We retain account and order records for as long as necessary for legal/accounting purposes, then securely delete or
        anonymize them.
      </p>

      <h3>6. Your Rights</h3>
      <ul>
        <li>Access, correction, deletion (where applicable), and portability of your data.</li>
        <li>Objection to certain processing and the right to withdraw consent.</li>
      </ul>

      <h3>7. Security</h3>
      <p>
        We use technical and organizational measures to protect data, including encryption-in-transit, access controls, and
        least-privilege practices.
      </p>

      <h3>8. International Transfers</h3>
      <p>
        If data is transferred outside of {info.country}, we use appropriate safeguards where required by law.
      </p>

      <h3>9. Contact</h3>
      <p>
        To exercise your rights or ask questions, contact {info.name} at {info.email}. Address: {info.address}
      </p>

      <Separator />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        This template is informational and may require updates to reflect local regulations and your specific processing.
      </p>



    </div>
  );
}
