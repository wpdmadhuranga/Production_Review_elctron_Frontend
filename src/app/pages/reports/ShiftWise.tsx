import { AlertCircle, Calendar, CheckCircle2, Package, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useMeta } from "../../context/MetaContext";
import { getProductionReportFilter } from "../../services/productionService";
import { normalizeDefectKey } from "../../utils/reportUtils";

interface DefectBreakdown {
  [defectKey: string]: number;
}

interface TyreItem {
  tyreItem: string;
  totalTyres: number;
  totalDefects: number;
  defects: DefectBreakdown;
  gradeC: number;
  gradeD: number;
}

export function ShiftWise() {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('today');
  const [shift, setShift] = useState('all');
  const [showResults, setShowResults] = useState(false);

  const [tyreData, setTyreData] = useState<TyreItem[]>([]);
  const [producedSum, setProducedSum] = useState<number>(0);
  const { tyreItems, shifts, defects } = useMeta();

  const norm = (v: any) => String(v ?? '').trim().toLowerCase();
  const getShiftCode = (selected: string) => {
    if (selected === 'all') return undefined;
    const found = (shifts || []).find((s: any) => {
      const code = (s as any).code;
      return norm(code) === norm(selected) || norm(s?.name) === norm(selected);
    });
    return ((found as any)?.code ?? (found as any)?.name ?? selected) as string;
  };

  const canonicalDefectOrder = ['airBubble', 'sidewall', 'treadCrack', 'centerMarking', 'lateralDamage', 'underBlister', 'underCure', 'overCure'];
  const fallbackDefectLabels: Record<string, string> = {
    airBubble: 'Air.Ble',
    sidewall: 'S.W',
    treadCrack: 'Tr.Cr',
    centerMarking: 'C.Mr',
    lateralDamage: 'L.Dam',
    underBlister: 'Un.Bl',
    underCure: 'U.Cure',
    overCure: 'Ov.Cure',
  };
  const defectColMap = new Map<string, string>();
  for (const d of defects || []) {
    const key = normalizeDefectKey(d?.name || '');
    if (!key) continue;
    if (!defectColMap.has(key)) defectColMap.set(key, d?.name || fallbackDefectLabels[key] || key);
  }
  if (defectColMap.size === 0) {
    for (const key of canonicalDefectOrder) {
      defectColMap.set(key, fallbackDefectLabels[key] || key);
    }
  } else {
    for (const key of canonicalDefectOrder) {
      if (defectColMap.has(key)) continue;
      defectColMap.set(key, fallbackDefectLabels[key] || key);
    }
  }
  const defectCols = Array.from(defectColMap.entries()).map(([key, label]) => ({ key, label }));

  const handleSearch = () => {
    (async () => {
      try {
        setShowResults(true);
        const isoFrom = `${dateFrom}T00:00:00Z`;
        const isoTo = `${dateTo}T23:59:59Z`;
        const selectedShiftCode = getShiftCode(shift);
        const shiftMatch = (candidate: any) => {
          if (!selectedShiftCode) return true;
          const c = norm(candidate);
          return c === norm(selectedShiftCode) || c === norm(shift);
        };

        const resp = await getProductionReportFilter({ dateFrom: isoFrom, dateTo: isoTo, shift: selectedShiftCode });
        const batches = Array.isArray(resp) ? resp : resp?.items ?? [];

        // collect tyre items and sum productEntries per tyreTypeId
        const items: any[] = [];
        let sumProd = 0;
        const prodMap: Record<string, number> = {};
        for (const b of batches) {
          if (Array.isArray((b as any).records)) {
            for (const r of (b as any).records) {
              if (Array.isArray(r.productEntries)) {
                if (shiftMatch(r.shift)) {
                  for (const pe of r.productEntries) {
                    const tid = pe?.tyreTypeId != null ? String(pe.tyreTypeId) : String(pe?.tyreTypeName || 'unknown');
                    const val = Number(pe?.totalProduction || 0);
                    prodMap[tid] = (prodMap[tid] || 0) + val;
                    sumProd += val;
                  }
                }
              }
            }
          }
          if (Array.isArray(b.tyreItems)) {
            for (const ti of b.tyreItems) {
              if (shiftMatch(ti.shift)) items.push(ti);
            }
          }
          if (Array.isArray((b as any).records)) {
            for (const r of (b as any).records) {
              if (Array.isArray(r.tyreItems)) {
                for (const ti of r.tyreItems) {
                  if (shiftMatch(ti.shift ?? r.shift)) items.push(ti);
                }
              }
            }
          }
        }

        // aggregate by tyreTypeId (or tyreTypeName)
        const map: Record<string, TyreItem> = {};
        for (const it of items) {
          const tid = it.tyreTypeId != null ? String(it.tyreTypeId) : (it.tyreTypeName || it.tyreItem || 'unknown');
          if (!map[tid]) {
            map[tid] = { tyreItem: tid, totalTyres: 0, totalDefects: 0, defects: {}, gradeC: 0, gradeD: 0 };
          }
          const row = map[tid];
          row.totalTyres += 1;
          const raw = (it.defect || '').toString();
          const isReal = raw !== '' && raw.toLowerCase() !== 'none';
          if (isReal) {
            row.totalDefects += 1;
            const key = normalizeDefectKey(raw);
            row.defects[key] = (row.defects[key] || 0) + 1;
          }
          const cd = (it.cOrD || '').toUpperCase();
          if (cd === 'C') row.gradeC += 1;
          if (cd === 'D') row.gradeD += 1;
        }

        // map to tyreItems metadata order, prefer production totals from productEntries
        const result: TyreItem[] = [];
        const used = new Set<string>();
        if (Array.isArray(tyreItems)) {
          for (const meta of tyreItems) {
            const key = meta.id != null ? String(meta.id) : String(meta.name);
            const found = map[key];
            if (found) {
              const total = prodMap[key] ?? found.totalTyres;
              result.push({ ...found, tyreItem: meta.name, totalTyres: total });
              used.add(key);
            } else {
              result.push({ tyreItem: meta.name, totalTyres: prodMap[key] ?? 0, totalDefects: 0, defects: {}, gradeC:0, gradeD:0 });
            }
          }
        }
        // append any leftover types from map not in metadata
        for (const k of Object.keys(map)) {
          if (used.has(k)) continue;
          const r = map[k];
          const total = prodMap[k] ?? r.totalTyres;
          result.push({ ...r, tyreItem: r.tyreItem, totalTyres: total });
        }

        setTyreData(result);
        setProducedSum(sumProd);
        console.log('Searching shift:', shift, 'from:', dateFrom, 'to:', dateTo, 'items:', items.length, 'producedSum:', sumProd);
      } catch (err: any) {
        console.error('Failed shift-wise report', err);
        alert(err?.message ?? String(err));
      }
    })();
  };

  const handleDurationChange = (selectedDuration: string) => {
    setDuration(selectedDuration);
    const today = new Date();
    let fromDate = new Date();

    switch (selectedDuration) {
      case 'today':
        fromDate = new Date();
        break;
      case 'week':
        fromDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        fromDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        break;
    }

    if (selectedDuration !== 'custom') {
      setDateFrom(fromDate.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    }
  };

  // Display data already filtered/aggregated by selected shift in `handleSearch`
  const filteredData = tyreData;

  const totalTyres = filteredData.reduce((sum, item) => sum + item.totalTyres, 0);
  const totalDefects = filteredData.reduce((sum, item) => sum + item.totalDefects, 0);
  const totalGradeC = filteredData.reduce((sum, item) => sum + item.gradeC, 0);
  const totalGradeD = filteredData.reduce((sum, item) => sum + item.gradeD, 0);
  const defectRate = totalTyres ? ((totalDefects / totalTyres) * 100).toFixed(2) : '0.00';
  const qualityRate = (100 - parseFloat(defectRate)).toFixed(2);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shift-wise Production Report</h1>
        <p className="text-gray-600 mt-2">View tire production per shift by date range</p>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Filter by Date Range & Shift
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
            <select value={duration} onChange={(e) => handleDurationChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={duration !== 'custom'} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={duration !== 'custom'} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="all">All Shifts</option>
              {(shifts || []).map((s: any) => {
                const value = s.code ?? s.name;
                const label = s.code && s.name && s.code !== s.name ? `${s.code} (${s.name})` : (s.name ?? s.code);
                return <option key={s.id ?? value} value={value}>{label}</option>;
              })}
            </select>
          </div>

          <div className="flex items-end">
            <button onClick={handleSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Search size={18} />
              Search
            </button>
          </div>
        </div>
      </div>

      {showResults ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Production</span>
                <Package size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{producedSum.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mt-1">Tires produced from product entries ({shift === 'all' ? 'All Shifts' : shift})</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Quality Rate</span>
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{qualityRate}%</p>
              <p className="text-xs text-gray-600 mt-1">Good quality tires</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Defect Rate</span>
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{defectRate}%</p>
              <p className="text-xs text-gray-600 mt-1">{totalDefects} defective tires</p>
            </div>

            <div className={`rounded-lg shadow-sm border p-5 ${parseFloat(qualityRate) >= 95 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : parseFloat(qualityRate) >= 90 ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200' : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Performance</span>
                <TrendingUp size={20} className={parseFloat(qualityRate) >= 95 ? 'text-green-600' : parseFloat(qualityRate) >= 90 ? 'text-blue-600' : 'text-yellow-600'} />
              </div>
              <p className={`text-2xl font-bold ${parseFloat(qualityRate) >= 95 ? 'text-green-700' : parseFloat(qualityRate) >= 90 ? 'text-blue-700' : 'text-yellow-700'}`}>
                {parseFloat(qualityRate) >= 95 ? 'Excellent' : parseFloat(qualityRate) >= 90 ? 'Good' : 'Fair'}
              </p>
              <p className="text-xs text-gray-600 mt-1">Overall status</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package size={20} />
                Tire Production Details — {shift === 'all' ? 'All Shifts' : shift}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Showing results from {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Tire Item</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Total Tires</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">Defects</th>
                    {defectCols.map((d) => (
                      <th key={d.key} className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">{d.label}</th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-green-700 uppercase tracking-wider bg-green-50 border-r border-gray-300">C</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-yellow-700 uppercase tracking-wider bg-yellow-50">D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">{item.tyreItem}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 font-semibold border-r border-gray-200">{item.totalTyres.toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200"><span className="text-red-600 font-semibold">{item.totalDefects}</span></td>
                      {defectCols.map((d) => (
                        <td key={d.key} className="px-3 py-3 whitespace-nowrap text-sm text-center text-gray-700 border-r border-gray-200">{(item.defects as any)[d.key]}</td>
                      ))}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-green-50 border-r border-gray-200"><span className="text-green-700 font-semibold">{item.gradeC}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-yellow-50"><span className="text-yellow-700 font-semibold">{item.gradeD}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50 border-t-2 border-blue-300">
                  <tr>
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 border-r border-gray-300">TOTAL</td>
                    <td className="px-4 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">{totalTyres.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-center font-bold text-red-600 border-r border-gray-300">{totalDefects}</td>
                    {defectCols.map((d) => (
                      <td key={d.key} className="px-3 py-4 text-sm text-center font-bold text-gray-900 border-r border-gray-300">{filteredData.reduce((s, it) => s + ((it.defects as any)[d.key] || 0), 0)}</td>
                    ))}
                    <td className="px-4 py-4 text-sm text-center font-bold text-green-700 bg-green-100 border-r border-gray-300">{totalGradeC}</td>
                    <td className="px-4 py-4 text-sm text-center font-bold text-yellow-700 bg-yellow-100">{totalGradeD}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Selected</h3>
          <p className="text-gray-600">Please select date range and shift, then click "Search".</p>
        </div>
      )}
    </div>
  );
}

export default ShiftWise;


