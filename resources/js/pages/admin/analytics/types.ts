export type KPIResponse = {
revenue: number;
orders: number;
aov: number;
units: number;
};


export type SeriesPoint = { date: string; value: number };
export type StatusPoint = { status: string; count: number };
export type NamedMetric = { name: string; value: number };
export type ClickSeriesPoint = { date: string; placement: string; clicks: number };

