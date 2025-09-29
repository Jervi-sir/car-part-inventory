import React from "react";
import HomePageController from "@/actions/App/Http/Controllers/HomePageController";

type StatsResponse = {
  verified_buyers: number;
  warehouses_pickups: number;
  clients_served: number;
  part_references: number;
  last_updated_iso?: string;
};

function usePublicStats(shouldFetch: boolean) {
  const [data, setData] = React.useState<StatsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!shouldFetch) return; // wait until visible
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(HomePageController.publicStatus().url, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Erreur");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [shouldFetch]);

  return { data, loading, error };
}

// ✅ Count-up animation
function useCountUp(value: number, duration = 1000) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let start: number | null = null;
    let frame: number;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return displayValue;
}

const formatBig = (n?: number) => {
  if (n == null) return "—";
  return n >= 1000
    ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k+`
    : `${n}+`;
};

export const Section4 = () => {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  // 🔎 Detect when Section4 enters viewport
  React.useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect(); // fetch only once
        }
      },
      { threshold: 0.3 } // 30% visible
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const { data, loading } = usePublicStats(visible);

  return (
    <section
      ref={sectionRef}
      id="stats"
      className="py-20 bg-white dark:bg-neutral-950"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-3xl font-bold text-center">
          Les chiffres ne mentent pas
        </h3>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400 text-center">
          Nous grandissons avec les mécaniciens, détaillants et passionnés
          d’automobile en Algérie.
        </p>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <Stat
            value={data?.verified_buyers}
            loading={loading}
            label="Acheteurs vérifiés"
          />
          <Stat
            value={data?.warehouses_pickups}
            loading={loading}
            label="Entrepôts & points de retrait"
          />
          <Stat
            value={data?.clients_served}
            loading={loading}
            label="Clients servis"
          />
          <Stat
            value={data?.part_references}
            loading={loading}
            label="Références de pièces"
          />
        </div>
      </div>
    </section>
  );
};

function Stat({
  value,
  label,
  loading,
}: {
  value?: number;
  label: string;
  loading: boolean;
}) {
  const animated = useCountUp(value ?? 0, 1200);

  return (
    <div className="text-center">
      <div className="text-4xl font-extrabold text-yellow-600">
        {loading ? "…" : formatBig(animated)}
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {label}
      </p>
    </div>
  );
}
