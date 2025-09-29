import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPIResponse } from "./types";
import { useApiQuery } from "./use-api-query";
import AnalyticsController from "@/actions/App/Http/Controllers/Admin/AnalyticsController";


declare const route: (name: string, params?: any) => string;


function Currency({ value }: { value: number }) {
  return <span>{value.toLocaleString(undefined, { style: "currency", currency: "DZD" })}</span>;
}
function NumberFmt({ value }: { value: number }) { return <span>{value.toLocaleString()}</span>; }


export function Kpis({ range }: { range: string }) {
  const { data, loading } = useApiQuery<KPIResponse>({
    url: AnalyticsController.kpis().url + `?range=${range}`,
    deps: [range],
  });


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard title="Revenue" loading={loading} value={data?.revenue} render={(v) => <Currency value={v || 0} />} />
      <KpiCard title="Orders" loading={loading} value={data?.orders} render={(v) => <NumberFmt value={v || 0} />} />
      <KpiCard title="AOV" loading={loading} value={data?.aov} render={(v) => <Currency value={v || 0} />} />
      <KpiCard title="Units Sold" loading={loading} value={data?.units} render={(v) => <NumberFmt value={v || 0} />} />
    </div>
  );
}


function KpiCard({ title, value, loading, render }: { title: string; value: number | undefined | null; loading: boolean; render: (v: number) => React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-32" /> : <div className="text-2xl font-semibold">{render(value ?? 0)}</div>}
      </CardContent>
    </Card>
  );
}