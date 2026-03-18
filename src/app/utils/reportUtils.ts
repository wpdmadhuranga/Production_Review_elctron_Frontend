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

  const denom = totalTyres + defectCount;
  const qualityRate = denom > 0 ? totalTyres / denom : 0;
  const qualityRatePct = qualityRate * 100;
  const defectRatePct = 100 - qualityRatePct;
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
      return 'airBubble';
    case 'sidewall':
      return 'sidewall';
    case 'treadcrack':
      return 'treadCrack';
    case 'centermarking':
      return 'centerMarking';
    case 'lateraldamage':
      return 'lateralDamage';
    case 'underblister':
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
