import { API_BASE_URL } from "../../config";
import { authFetch } from "./authService";

export interface ProductionRecordProductEntry {
  tyreTypeId: number;
  totalProduction: number;
}

export interface ProductionRecordTyreItemEntry {
  serialNumber: string;
  operatorNumber: number;
  userId: number;
  createdBy: string | number;
  defect: string;
  cOrD: "C" | "D" | string;
  tyreTypeId: number;
  moldNumberId: number;
  totalProduction: number;
}

export interface ProductionRecordBatchEntry {
  lineNumberId: number;
  shift: string;
  productionDate: string;
  createdBy: string | number;
  plannedTotalTyres: number;
  actualTotalTyres: number;
  productEntries: ProductionRecordProductEntry[];
  tyreItems: ProductionRecordTyreItemEntry[];
}

const BASE = `${API_BASE_URL}/api/v1`;

export async function batchCreateProductionRecords(
  payload: ProductionRecordBatchEntry[]
): Promise<any> {
  const res = await authFetch(`${BASE}/production-record/batch-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Batch create failed: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}

export async function getProductionReportFilter(options: {
  dateFrom?: string | Date | null;
  dateTo?: string | Date | null;
  tyreTypeId?: number | null;
  defect?: string | null;
  shift?: string | null;
  line?: string | null;
}): Promise<any> {
  const { dateFrom, dateTo, tyreTypeId, defect, shift, line } = options || {};

  const params = new URLSearchParams();
  if (dateFrom) params.append("dateFrom", typeof dateFrom === "string" ? dateFrom : dateFrom.toISOString());
  if (dateTo) params.append("dateTo", typeof dateTo === "string" ? dateTo : dateTo.toISOString());
  if (tyreTypeId != null) params.append("tyreTypeId", String(tyreTypeId));
  if (defect) params.append("defect", defect);
  if (shift) params.append("shift", shift);
  if (line) params.append("line", line);

  const url = `${BASE}/production-report/filter${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await authFetch(url, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Production report filter failed: ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}
