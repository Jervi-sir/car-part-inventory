import React, { useMemo } from "react";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClickSeriesPoint } from "./types";
import { useApiQuery } from "./use-api-query";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";
import AnalyticsController from "@/actions/App/Http/Controllers/Admin/AnalyticsController";


declare const route: (name: string, params?: any) => string;


export function AdsClicksStacked({ range, chartConfig }: { range: string; chartConfig: any }) {
  const { data, loading } = useApiQuery<ClickSeriesPoint[]>({
    url: AnalyticsController.adClicksByPlacement().url + `?range=${range}`,
    deps: [range],
  });


  const clicks = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    (data || []).forEach((p) => {
      map[p.date] ??= {};
      map[p.date][p.placement ?? "unknown"] = p.clicks;
    });
    const placements = Array.from(new Set((data || []).map((p) => p.placement ?? "unknown")));
    const rows = Object.entries(map)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, byPlacement]) => ({ date, ...placements.reduce((acc, pl) => ({ ...acc, [pl]: byPlacement[pl] || 0 }), {}) }));
    return { placements, rows } as { placements: string[]; rows: any[] };
  }, [data]);


  return (
    <Card>
      <CardHeader><CardTitle>Clics sur les annonces par emplacement</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer>
              <BarChart data={clicks.rows} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis width={50} />
                <Tooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {clicks.placements.map((pl) => (
                  <Bar key={pl} dataKey={pl} stackId="a" />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}