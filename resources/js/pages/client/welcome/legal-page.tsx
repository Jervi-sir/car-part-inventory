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
  const metaTitle = type === "terms" ? "Conditions d’utilisation" : "Politique de confidentialité";
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
              <Link href={route("login")}> <Button variant="ghost" className="hidden sm:inline-flex">Se connecter</Button> </Link>
              <Link href={route("register")}> <Button className="rounded-xl">Créer un compte</Button> </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <Card className="rounded-2xl border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-2xl">{metaTitle}</CardTitle>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Dernière mise à jour : {updated}</div>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            {type === "terms" ? <TermsBody info={info} /> : <PrivacyBody info={info} />}
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-sm text-neutral-500 dark:text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} CarParts DZ. Tous droits réservés.</div>
          <div className="flex items-center gap-4">
            <Link href={route("terms")}>Conditions</Link>
            <Link href={route("privacy")}>Confidentialité</Link>
            <Link href={route("register")}>Créer un compte</Link>
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
        Les présentes Conditions d’utilisation (« Conditions ») régissent votre accès et votre utilisation de la plateforme
        {` ${info.name} `} pour la consultation et l’achat de pièces automobiles et services associés (le « Service »).
        En créant un compte ou en utilisant le Service, vous acceptez ces Conditions.
      </p>

      <h3>1. Admissibilité et comptes</h3>
      <p>
        Vous devez avoir au moins 18 ans. Vous êtes responsable de vos identifiants et de toute activité réalisée via votre
        compte. Des vérifications supplémentaires peuvent être requises pour les comptes professionnels (B2B).
      </p>

      <h3>2. Accès et disponibilité</h3>
      <p>
        L’accès aux prix en direct, au stock et à la commande est réservé aux utilisateurs enregistrés. Nous pouvons
        modifier ou interrompre des fonctionnalités à tout moment pour préserver la disponibilité et l’exactitude.
      </p>

      <h3>3. Tarifs et commandes</h3>
      <ul>
        <li>Les prix sont affichés en DZD sauf indication contraire ; une tarification par paliers (détail / demi-gros / gros) peut s’appliquer selon l’article.</li>
        <li>La soumission d’une commande constitue une offre d’achat ; nous pouvons accepter ou refuser votre commande à notre discrétion.</li>
        <li>Pour les commandes en gros, les devis peuvent avoir des périodes de validité et des contraintes de stock.</li>
      </ul>

      <h3>4. Expédition, retrait et risques</h3>
      <ul>
        <li>Les options de livraison incluent coursier ou poste ; vous pouvez également choisir le retrait en entrepôt lorsque disponible.</li>
        <li>Le transfert des risques s’opère à la remise au transporteur ou lors du retrait.</li>
      </ul>

      <h3>5. Retours et garanties</h3>
      <ul>
        <li>Les retours sont soumis à une autorisation préalable et à l’état des articles. Les pièces électriques et commandes spéciales peuvent être non retournables.</li>
        <li>Les pièces OEM/aftermarket sont couvertes par leurs garanties fabricant respectives, le cas échéant.</li>
      </ul>

      <h3>6. Usages interdits</h3>
      <p>
        Vous vous engagez à ne pas faire un usage abusif du Service, notamment via le scraping, la revente d’accès, la
        publication de contenus illicites ou l’atteinte aux systèmes.
      </p>

      <h3>7. Propriété intellectuelle</h3>
      <p>
        L’ensemble des contenus, marques et données du Service appartiennent à {info.name} ou à ses concédants. Une licence
        limitée et non exclusive vous est accordée pour utiliser le Service.
      </p>

      <h3>8. Responsabilité</h3>
      <p>
        Dans la mesure permise par la loi, {info.name} ne saurait être tenue responsable des dommages indirects, accessoires
        ou consécutifs découlant de votre utilisation du Service.
      </p>

      <h3>9. Droit applicable</h3>
      <p>
        Les présentes Conditions sont régies par les lois de {info.country}. Les litiges seront traités par les tribunaux
        compétents du lieu où nous sommes établis, sous réserve des protections impératives des consommateurs.
      </p>

      <h3>10. Contact</h3>
      <p>
        Des questions concernant ces Conditions ? Contactez-nous à {info.email}. Adresse : {info.address}
      </p>

      <Separator />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Ce modèle est général et peut nécessiter des ajustements pour répondre aux exigences juridiques de votre
        juridiction ou à votre modèle commercial.
      </p>
    </div>
  );
}

function PrivacyBody({ info }: { info: { name: string; country: string; email: string; address: string } }) {
  return (
    <div className="space-y-6">
      <p>
        La présente Politique de confidentialité explique comment {info.name} collecte, utilise et protège les informations
        personnelles lorsque vous créez un compte et utilisez notre Service.
      </p>

      <h3>1. Données que nous collectons</h3>
      <ul>
        <li>Données de compte : nom, e-mail, téléphone (optionnel), hachage du mot de passe.</li>
        <li>Coordonnées de livraison : destinataire, téléphone, adresse, pays.</li>
        <li>Données de commande : articles, quantités, montants, mode de livraison, notes.</li>
        <li>Données techniques : informations appareil/navigateur, adresse IP et journaux d’utilisation à des fins de sécurité.</li>
      </ul>

      <h3>2. Utilisation des données</h3>
      <ul>
        <li>Créer et gérer votre compte et authentifier l’accès.</li>
        <li>Traiter les commandes, livraisons/retraits, retours et support.</li>
        <li>Prévenir la fraude et assurer la sécurité de la plateforme.</li>
        <li>Améliorer notre catalogue et l’expérience utilisateur.</li>
      </ul>

      <h3>3. Bases juridiques</h3>
      <p>
        Nous traitons les données pour exécuter notre contrat avec vous (commandes, compte), respecter nos obligations légales
        (fiscales, facturation) et sur la base de nos intérêts légitimes (sécurité, amélioration du service). Lorsque requis,
        nous nous fondons sur votre consentement.
      </p>

      <h3>4. Partage</h3>
      <ul>
        <li>Prestataires logistiques et transporteurs pour la livraison.</li>
        <li>Prestataires de paiement pour les transactions.</li>
        <li>Fournisseurs IT/tiers de service soumis à des obligations de confidentialité et de protection des données.</li>
        <li>Autorités lorsque la loi l’exige.</li>
      </ul>

      <h3>5. Conservation</h3>
      <p>
        Nous conservons les comptes et historiques de commandes aussi longtemps que nécessaire à des fins légales/comptables,
        puis les supprimons ou les anonymisons de manière sécurisée.
      </p>

      <h3>6. Vos droits</h3>
      <ul>
        <li>Accès, rectification, suppression (le cas échéant) et portabilité de vos données.</li>
        <li>Opposition à certains traitements et droit de retirer votre consentement.</li>
      </ul>

      <h3>7. Sécurité</h3>
      <p>
        Nous appliquons des mesures techniques et organisationnelles pour protéger les données, notamment le chiffrement en
        transit, des contrôles d’accès et le principe du moindre privilège.
      </p>

      <h3>8. Transferts internationaux</h3>
      <p>
        Si des données sont transférées en dehors de {info.country}, nous mettons en place les garanties appropriées lorsque
        la loi l’exige.
      </p>

      <h3>9. Contact</h3>
      <p>
        Pour exercer vos droits ou poser des questions, contactez {info.name} à {info.email}. Adresse : {info.address}
      </p>

      <Separator />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Ce modèle est informatif et peut nécessiter des mises à jour pour refléter les réglementations locales et vos
        traitements spécifiques.
      </p>
    </div>
  );
}
