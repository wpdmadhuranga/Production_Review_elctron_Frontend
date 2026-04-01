export interface TyreItemApi {
  id?: number;
  serialNumber?: string;
  operatorNumber?: number;
  userId?: number;
  defect?: string | null;
  cOrD?: string | null;
  line?: string | null;
  shift?: string | null;
  date?: string | null;
  tyreTypeId?: number | null;
  moldNumberId?: number | null;
}

export interface ProductionBatchApi {
  productionBatchId?: number;
  totalTyre?: number;
  date?: string | null;
  plannedTotalTyres?: number;
  actualTotalTyres?: number;
  tyreItems?: TyreItemApi[];
}

export interface DefectBreakdownTotals {
  [defect: string]: number;
}

export interface Aggregates {
  totalTyres: number;
  defectCount: number;
  qualityRatePct: number; // 0-100
  defectRatePct: number; // 0-100
  totalGradeC: number;
  totalGradeD: number;
  defectsByType: DefectBreakdownTotals;
  totalPlanned: number;
  totalActual: number;
  performancePct: number; // actual/planned * 100
}

export function computeAggregatesFromBatches(batches: ProductionBatchApi[] = []): Aggregates {
  const totalTyres = batches.reduce((s, b) => s + (b.totalTyre || 0), 0);
  let defectCount = 0;
  let totalGradeC = 0;
  let totalGradeD = 0;
  const defectsByType: DefectBreakdownTotals = {};
  let totalPlanned = 0;
  let totalActual = 0;

  for (const b of batches) {
    // collect tyreItems from batch level and from nested records (records[].tyreItems)
    const items: TyreItemApi[] = [];
    if (Array.isArray(b.tyreItems)) items.push(...b.tyreItems);
    if (Array.isArray((b as any).records)) {
      for (const r of (b as any).records) {
        if (Array.isArray(r.tyreItems)) items.push(...r.tyreItems);
      }
    }

    for (const it of items) {
      const raw = (it.defect || '').toString().trim();
      const isRealDefect = raw !== '' && raw.toLowerCase() !== 'none';
      if (!isRealDefect) continue;
      const d = normalizeDefectKey(raw);
      defectsByType[d] = (defectsByType[d] || 0) + 1;
      defectCount += 1;
      const cd = (it.cOrD || '').toUpperCase();
      if (cd === 'C') totalGradeC++;
      if (cd === 'D') totalGradeD++;
    }

    // Sum planned/actual from nested records if available, otherwise fall back to batch level
    if (Array.isArray((b as any).records) && (b as any).records.length > 0) {
      for (const r of (b as any).records) {
        totalPlanned += Number(r.plannedTotalTyres || 0);
        totalActual += Number(r.actualTotalTyres || 0);
      }
    } else {
      totalPlanned += b.plannedTotalTyres || 0;
      totalActual += b.actualTotalTyres || 0;
    }
  }

  // Ensure defectCount does not exceed totalTyres and compute rates
  const effectiveDefectCount = Math.min(defectCount, totalTyres);
  const qualityRate = totalTyres > 0 ? (totalTyres - effectiveDefectCount) / totalTyres : 0;
  const qualityRatePct = qualityRate * 100;
  const defectRatePct = totalTyres > 0 ? (effectiveDefectCount / totalTyres) * 100 : 0;
  const performancePct = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  // debug: log totals
//   console.log('[reportUtils] totalTyres:', totalTyres);
//   console.log('[reportUtils] defectCount:', defectCount);

  return {
    totalTyres,
    defectCount,
    qualityRatePct,
    defectRatePct,
    totalGradeC,
    totalGradeD,
    defectsByType,
    totalPlanned,
    totalActual,
    performancePct,
  };
}

export function normalizeDefectKey(raw: string): string {
  const s = raw.toLowerCase().trim();
  // remove punctuation and spaces
  const key = s.replace(/[^a-z0-9]/g, '');
  switch (key) {
    case 'airbubble':
    case 'airble':
    case 'airbl':
      return 'airBubble';
    case 'sidewall':
    case 'sw':
      return 'sidewall';
    case 'treadcrack':
    case 'trcr':
      return 'treadCrack';
    case 'centermarking':
    case 'cmr':
      return 'centerMarking';
    case 'lateraldamage':
    case 'ldam':
      return 'lateralDamage';
    case 'underblister':
    case 'unbl':
      return 'underBlister';
    case 'ucure':
    case 'undercure':
      return 'underCure';
    case 'ovcure':
    case 'overcure':
      return 'overCure';
    default:
      return key; // fallback to cleaned key
  }
}

export interface TyreTypeRow {
  tyreTypeId: number | string;
  tyreTypeName?: string;
  totalDefects: number;
  defects: DefectBreakdownTotals;
  gradeC: number;
  gradeD: number;
  occurrences: number; // number of tyreItems for this type
  producedTotal: number; // sum of productEntries.totalProduction for this tyre type
}

export function groupTyreItemsByType(batches: ProductionBatchApi[] = []): TyreTypeRow[] {
  const map = new Map<number | string, TyreTypeRow>();
  for (const b of batches) {
    // merge batch-level tyreItems and record-level tyreItems
    const items: TyreItemApi[] = [];
    if (Array.isArray(b.tyreItems)) items.push(...b.tyreItems);
    if (Array.isArray((b as any).records)) {
      for (const r of (b as any).records) {
        if (Array.isArray(r.tyreItems)) items.push(...r.tyreItems);
      }
    }

    for (const it of items) {
      const key = it.tyreTypeId ?? 'unknown';
      let row = map.get(key);
      if (!row) {
        row = { tyreTypeId: key, tyreTypeName: String(key), totalDefects: 0, defects: {}, gradeC: 0, gradeD: 0, occurrences: 0, producedTotal: 0 };
        map.set(key, row);
      }
      row.occurrences += 1;
      const raw = (it.defect || '').toString().trim();
      const isRealDefect = raw !== '' && raw.toLowerCase() !== 'none';
      if (isRealDefect) {
        const d = normalizeDefectKey(raw);
        row.defects[d] = (row.defects[d] || 0) + 1;
        row.totalDefects += 1;
        const cd = (it.cOrD || '').toUpperCase();
        if (cd === 'C') row.gradeC += 1;
        if (cd === 'D') row.gradeD += 1;
      }
    }
    // accumulate produced totals from productEntries on records
    if (Array.isArray((b as any).records)) {
      for (const r of (b as any).records) {
        if (!Array.isArray(r.productEntries)) continue;
        for (const p of r.productEntries) {
          const key = p.tyreTypeId ?? 'unknown';
          const row = map.get(key) || (() => {
            const newRow: TyreTypeRow = { tyreTypeId: key, tyreTypeName: String(key), totalDefects: 0, defects: {}, gradeC: 0, gradeD: 0, occurrences: 0, producedTotal: 0 };
            map.set(key, newRow);
            return newRow;
          })();
          row.producedTotal += Number(p.totalProduction || 0);
        }
      }
    }
  }
  return Array.from(map.values());
}

export function safePercent(value: number): string {
  if (!isFinite(value)) return '0.00';
  return value.toFixed(2);
}

export interface MonthlySummarySection {
  from?: string;
  to?: string;
  report?: ProductionBatchApi[];
}

export interface MonthlySummaryResponse {
  currentMonth?: MonthlySummarySection;
  previousMonth?: MonthlySummarySection;
}

export interface DailySeriesPoint {
  date: string; // YYYY-MM-DD
  produced: number;
  target: number;
  defective: number;
  performancePct: number;
  qualityRatePct: number;
}

export function groupBatchesByDate(batches: ProductionBatchApi[] = []) {
  const map = new Map<string, ProductionBatchApi[]>();
  for (const b of batches) {
    if (!b || !b.date) continue;
    try {
      const dt = new Date(b.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const arr = map.get(key) || [];
      arr.push(b);
      map.set(key, arr);
    } catch {
      continue;
    }
  }
  return map;
}

export function buildDailySeriesFromBatches(batches: ProductionBatchApi[] = []): DailySeriesPoint[] {
  const map = groupBatchesByDate(batches);
  const out: DailySeriesPoint[] = Array.from(map.entries()).map(([date, bs]) => {
    const agg = computeAggregatesFromBatches(bs);
    return {
      date,
      produced: agg.totalTyres,
      target: agg.totalPlanned,
      defective: agg.defectCount,
      performancePct: agg.performancePct,
      qualityRatePct: agg.qualityRatePct,
    };
  });
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

export function getAggregatesForDate(batches: ProductionBatchApi[] = [], date: string | Date): Aggregates {
  const d = typeof date === 'string' ? new Date(date) : date;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const map = groupBatchesByDate(batches);
  const bs = map.get(key) || [];
  return computeAggregatesFromBatches(bs);
}

export function getPreviousMonthSameDayAggregates(prevBatches: ProductionBatchApi[] = [], date: string | Date): Aggregates | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const matched = (prevBatches || []).filter((b) => {
    if (!b || !b.date) return false;
    try {
      const dt = new Date(b.date);
      return dt.getDate() === day;
    } catch {
      return false;
    }
  });
  if (!matched || matched.length === 0) return null;
  return computeAggregatesFromBatches(matched);
}

export interface ProductionLineSummary {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'maintenance' | 'error';
  currentProduction: number;
  target: number;
  efficiency: number; // 0-100
}

function deriveLineStatus(efficiency: number, target: number, currentProduction: number) {
  if (!target || target === 0) {
    return currentProduction === 0 ? 'idle' : 'running';
  }
  if (efficiency >= 90) return 'running';
  if (efficiency >= 60) return 'maintenance';
  return 'error';
}

export function buildLineSummariesForDate(batches: ProductionBatchApi[] = [], date: string | Date): ProductionLineSummary[] {
  const d = typeof date === 'string' ? new Date(date) : date;
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const map = groupBatchesByDate(batches);
  const bs = map.get(key) || [];
  const lines = new Map<string, ProductionLineSummary>();

  for (const b of bs) {
    if (!Array.isArray((b as any).records)) continue;
    for (const r of (b as any).records) {
      const lid = String(r.lineNumberId ?? r.lineNumber ?? 'unknown');
      const name = r.lineNumber ?? `Line ${lid}`;
      const row = lines.get(lid) || { id: lid, name, status: 'idle' as const, currentProduction: 0, target: 0, efficiency: 0 };
      row.currentProduction += Number(r.actualTotalTyres || 0);
      row.target += Number(r.plannedTotalTyres || 0);
      // count defects in tyreItems for this record
      if (Array.isArray(r.tyreItems)) {
        for (const it of r.tyreItems) {
          const raw = (it.defect || '').toString().trim();
          const isRealDefect = raw !== '' && raw.toLowerCase() !== 'none';
          if (isRealDefect) {
            // no-op for now; defects could be aggregated per-line if needed
          }
        }
      }
      lines.set(lid, row);
    }
  }

  const out: ProductionLineSummary[] = [];
  for (const v of lines.values()) {
    const eff = v.target > 0 ? (v.currentProduction / v.target) * 100 : 0;
    v.efficiency = Number.isFinite(eff) ? Math.round(eff * 100) / 100 : 0;
    v.status = deriveLineStatus(v.efficiency, v.target, v.currentProduction) as ProductionLineSummary['status'];
    out.push(v);
  }
  return out;
}
