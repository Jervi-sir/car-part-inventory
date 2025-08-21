import React from "react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeriesPoint } from "./types";
import { useApiQuery } from "./use-api-query";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip } from "recharts";


declare const route: (name: string, params?: any) => string;

export function RevenueChart({ range, chartConfig }: { range: string; chartConfig: any }) {
  const { data, loading } = useApiQuery<SeriesPoint[]>({
    url: route("admin.analytics.revenue-series") + `?range=${range}`,
    deps: [range],
  });


  return (
    <Card className="xl:col-span-2">
      <CardHeader><CardTitle>Revenue over time</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <ResponsiveContainer>
              <LineChart data={data || []} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => v.toLocaleString()} width={70} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}