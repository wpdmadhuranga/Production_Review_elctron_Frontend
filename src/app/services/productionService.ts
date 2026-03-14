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
