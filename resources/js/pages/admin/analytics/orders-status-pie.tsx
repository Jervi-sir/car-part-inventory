import React from "react";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPoint } from "./types";
import { useApiQuery } from "./use-api-query";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";


declare const route: (name: string, params?: any) => string;


export function OrdersStatusPie({ range, chartConfig }: { range: string; chartConfig: any }) {
  const { data, loading } = useApiQuery<StatusPoint[]>({
    url: route("admin.analytics.orders-by-status") + `?range=${range}`,
    deps: [range],
  });


  return (
    <Card>
      <CardHeader><CardTitle>Commandes par statut</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip content={<ChartTooltipContent />} />
                  <Pie data={data || []} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80}>
                    {(data || []).map((_, idx) => (<Cell key={idx} />))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(data || []).map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{s.status}</span>
                  <Badge variant="secondary">{s.count}</Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}