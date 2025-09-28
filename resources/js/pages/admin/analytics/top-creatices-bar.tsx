import React from "react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NamedMetric } from "./types";
import { useApiQuery } from "./use-api-query";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";


declare const route: (name: string, params?: any) => string;


export function TopCreativesBar({ range, chartConfig }: { range: string; chartConfig: any }) {
  const { data, loading } = useApiQuery<NamedMetric[]>({
    url: route("admin.analytics.top-creatives-clicks") + `?range=${range}&limit=10`,
    deps: [range],
  });


  return (
    <Card>
      <CardHeader><CardTitle>Meilleures créations par clics</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer>
              <BarChart data={data || []} layout="vertical" margin={{ left: 16, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={160} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}