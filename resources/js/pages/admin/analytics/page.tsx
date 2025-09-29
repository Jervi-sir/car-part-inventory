import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import { AdminLayout } from "../layout/admin-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ChartConfig } from "@/components/ui/chart";
import { RevenueChart } from "./revenue-chart";
import { OrdersStatusPie } from "./orders-status-pie";
import { Kpis } from "./kpis";
import { RankedBar } from "./ranked-bar";
import { AdsClicksStacked } from "./ads-clicks-stacked";
import { TopCreativesBar } from "./top-creatices-bar";
import AnalyticsController from "@/actions/App/Http/Controllers/Admin/AnalyticsController";


export const chartConfig: ChartConfig = {
  desktop: { label: "Desktop", color: "#2563eb" },
  mobile: { label: "Mobile", color: "#60a5fa" },
};

declare const route: (name: string, params?: any) => string;

export default function AnalyticsPage() {
  const [range, setRange] = useState<string>("30d");

  return (
    <AdminLayout title="Analyses">
      <div className="p-6 pt-0">
        <Head title="Analytics" />
        <div className="flex items-center justify-between pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Analyses</h1>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">90 derniers jours</SelectItem>
                <SelectItem value="ytd">Cumul annuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Kpis range={range} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
          <RevenueChart range={range} chartConfig={chartConfig} />
          <OrdersStatusPie range={range} chartConfig={chartConfig} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
          <RankedBar title="Top manufacturers (revenue)" url={AnalyticsController.topManufacturers().url} range={range} chartConfig={chartConfig} />
          <RankedBar title="Top vehicle brands (revenue)" url={AnalyticsController.topBrands().url} range={range} chartConfig={chartConfig} />
          <RankedBar title="Top parts (revenue)" url={AnalyticsController.topParts().url} range={range} chartConfig={chartConfig} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
          <AdsClicksStacked range={range} chartConfig={chartConfig} />
          <TopCreativesBar range={range} chartConfig={chartConfig} />
        </div>
      </div>
    </AdminLayout>
  );
}