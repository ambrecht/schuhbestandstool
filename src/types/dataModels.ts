export type SkuKey = {
  artikel: string;
  variante: string;
  leiste: string;
  groesse: string;
  qualitaet: string;
  lager: string;
};

export type InventoryRow = SkuKey & {
  bestand: number;
  grosshandelspreis: number | null;
  bestandseinheit: string;
  ean?: string | null;
};

export type SalesRow = SkuKey & {
  menge: number;
  datum: Date;
  verkaufspreis: number | null;
  kategorie: string;
  status: string;
  anmerkung: string;
};

export type AggregatedSales = SkuKey & {
  salesQty: number;
  firstSaleDate: Date | null;
  lastSaleDate: Date | null;
  revenue: number;
  daysWithSales: number;
};

export type SkuMetrics = SkuKey & {
  stockQty: number;
  salesQtyPeriod: number;
  avgDailySales: number;
  sellThrough: number | null;
  daysOfCover: number | null;
  reorderPoint: number;
  orderQty: number;
  priority: "urgent" | "priority" | "monitor";
  lastSaleDate: Date | null;
};
