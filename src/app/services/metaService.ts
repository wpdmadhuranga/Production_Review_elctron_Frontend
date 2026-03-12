import { API_BASE_URL } from "../../config";
import { authFetch } from "./authService";

export interface MetaItem {
  id: number;
  name: string;
}

export interface MetaData {
  tyreItems: MetaItem[];
  lines: MetaItem[];
  moldNumbers: MetaItem[];
  shifts: MetaItem[];
  defects: MetaItem[];
  operators: MetaItem[];
}

const BASE = `${API_BASE_URL}/api/v1`;

async function fetchList(path: string): Promise<MetaItem[]> {
  try {
    const res = await authFetch(`${BASE}/${path}`);
    if (!res.ok) return [];
    const data = await res.json();

    // Debug: log raw shift data so we can pick the correct display field
    if (path.includes("shift")) console.log("raw shift endpoint data", data);

    if (!Array.isArray(data)) return [];

    return data.map((it: any) => {
      const id = it.id ?? it.ID ?? it.Id ?? 0;
      const name =
        it.moldNumber ??
        it.mold_number ??
        it.operatorNumber ??
        it.operator_number ??
        it.operatorName ??
        it.operator_name ??
        it.shiftName ??
        it.shift_name ??
        it.shift ??
        it.shift_type ??
        it.shiftType ??
        it.defectName ??
        it.defect_name ??
        it.name ??
        it.lineNumber ??
        it.line_number ??
        (it.partNumber ? `${it.partNumber} - ${it?.tyreItem ?? ""}`.trim() : undefined) ??
        it.tyreItem ??
        it.part_number ??
        it.label ??
        String(id);
      return { id: Number(id), name } as MetaItem;
    });
  } catch (err) {
    console.error("fetchList error", path, err);
    return [];
  }
}

export async function fetchAllMetadata(): Promise<MetaData> {
  const [tyreItems, lines, moldNumbers, shifts, defects, operators] =
    await Promise.all([
      fetchList("tyre-type/all"),
      fetchList("line-number/all"),
      fetchList("mold-number/all"),
      fetchList("shift/all"),
      fetchList("defect/all"),
      fetchList("operator/all"),
    ]);

  return { tyreItems, lines, moldNumbers, shifts, defects, operators };
}
