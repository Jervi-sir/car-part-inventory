import React from "react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NamedMetric } from "./types";
import { useApiQuery } from "./use-api-query";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";


declare const route: (name: string, params?: any) => string;

export function RankedBar({ title, url, range, chartConfig }: { title: string; url: string; range: string; chartConfig: any }) {
  const { data, loading } = useApiQuery<NamedMetric[]>({ url: `${url}?range=${range}&limit=10`, deps: [url, range] });


  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-6" />))}</div>
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