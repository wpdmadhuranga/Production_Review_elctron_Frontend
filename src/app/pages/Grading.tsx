import { CalendarIcon, CheckCircle, Save, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useMeta } from "../context/MetaContext";
import { batchCreateProductionRecords } from "../services/productionService";

interface MetaItem { id: number; name: string }

function decodeJwtPayload(token?: string | null): any | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserIdFromToken(token?: string | null): number | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const candidate = payload.sub ?? payload.userId ?? payload.id ?? payload.nameid ?? payload.uid;
  const id = candidate ? Number(candidate) : NaN;
  return Number.isFinite(id) ? id : null;
}

interface DefectEntry {
  id: string;
  date: string;
  tyreItem: string;
  productionLine: string;
  serialNumber: string;
  moldNumber: string;
  shift: string;
  defect: string;
  defectClass: 'C' | 'D' | '';
  operatorNumber: string;
  timestamp: string;
}

interface ProductEntry {
  id: string;
  productType: string;
  quantity: number;
  lineNumber: string;
  batchNumber: string;
  shift: string;
  totalTyre: number;
}

interface SummaryEntry {
  id: string;
  shift: string;
  totalProduction: number;
  totalDefects: number;
  qualityRate: number;
  efficiency: number;
  date: string;
  linePlans: number[];
  lineActuals: number[];
  lineEfficiencies: number[];
  summaryPlan: number;
  summaryActual: number;
  summaryEfficiency: number;
}

const EMPTY_DEFECT_FORM = {
  date: new Date().toISOString().split('T')[0],
  tyreItem: '',
  productionLine: '',
  serialNumber: '',
  moldNumber: '',
  shift: '',
  defect: '',
  defectClass: '' as 'C' | 'D' | '',
  operatorNumber: '',
};

export function Grading() {
  const [activeTab, setActiveTab] = useState<'defects' | 'products' | 'summary'>('defects');

  // Metadata from context (fetched once at app startup, cached in localStorage)
  const { tyreItems, lines, moldNumbers, shifts, defects, operators, loading: metaLoading } = useMeta();
  const { token } = useAuth();
  const userId = getUserIdFromToken(token) ?? 1; // fallback to 1 if token doesn't include an ID
  const createdBy = String(userId);

  const getMetaName = (list: MetaItem[], value: string | number) => {
    const found = list.find((it) => String(it.id) === String(value));
    return found ? found.name : String(value);
  };

  // Defect Form State
  const [defectForm, setDefectForm] = useState(EMPTY_DEFECT_FORM);
  const [defectEntries, setDefectEntries] = useState<DefectEntry[]>([]);

  // Product Form State
  const [productForm, setProductForm] = useState({
    productType: '', // tyreItem id
    quantity: '',
    lineNumber: '', // line id
    batchNumber: '',
    totalTyre: '',
    shift: '',
  });
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);

  // Summary Form State
  const [summaryForm, setSummaryForm] = useState({
    shift: '',
    totalProduction: '',
    totalDefects: '',
    qualityRate: '',
    efficiency: '',
    date: new Date().toISOString().split('T')[0],
    linePlans: [] as string[],
    lineActuals: [] as string[],
  });
  const [summaryEntries, setSummaryEntries] = useState<SummaryEntry[]>([]);

  // Add Defect Entry
  const addDefectEntry = () => {
    const { date, tyreItem, productionLine, serialNumber, moldNumber, shift, defect, defectClass, operatorNumber } = defectForm;
    const newEntry: DefectEntry = {
      id: Date.now().toString(),
      date, tyreItem, productionLine, serialNumber, moldNumber, shift, defect, defectClass, operatorNumber,
      timestamp: new Date().toLocaleString(),
    };
    setDefectEntries([...defectEntries, newEntry]);
    setDefectForm(EMPTY_DEFECT_FORM);
  };

  // Add Product Entry
  const addProductEntry = () => {
    const newEntry: ProductEntry = {
      id: Date.now().toString(),
      productType: productForm.productType, // stored as tyreItem id
      quantity: Number(productForm.quantity),
      lineNumber: productForm.lineNumber, // stored as line id
      batchNumber: productForm.batchNumber,
      shift: productForm.shift,
      totalTyre: Number(productForm.totalTyre),
    };

    setProductEntries([...productEntries, newEntry]);
    setProductForm({ productType: '', quantity: '', lineNumber: '', batchNumber: '', totalTyre: '', shift: 'day' });
  };

  // Add Summary Entry
  const addSummaryEntry = () => {
    const linePlans = lines.map((_, i) => Number(summaryForm.linePlans[i] || 0));
    const lineActuals = lines.map((_, i) => Number(summaryForm.lineActuals[i] || 0));
    const lineEfficiencies = linePlans.map((p, i) => p > 0 ? (lineActuals[i] / p) * 100 : 0);

    const totalPlan = linePlans.reduce((s, v) => s + v, 0);
    const totalActual = lineActuals.reduce((s, v) => s + v, 0);
    const totalEfficiency = totalPlan > 0 ? (totalActual / totalPlan) * 100 : 0;

    const newEntry: SummaryEntry = {
      id: Date.now().toString(),
      shift: summaryForm.shift,
      totalProduction: Number(summaryForm.totalProduction),
      totalDefects: Number(summaryForm.totalDefects),
      qualityRate: Number(summaryForm.qualityRate),
      efficiency: Number(summaryForm.efficiency),
      date: summaryForm.date,
      linePlans,
      lineActuals,
      lineEfficiencies,
      summaryPlan: totalPlan,
      summaryActual: totalActual,
      summaryEfficiency: totalEfficiency,
    };

    setSummaryEntries([...summaryEntries, newEntry]);
    setSummaryForm({ 
      shift: '', 
      totalProduction: '', 
      totalDefects: '', 
      qualityRate: '', 
      efficiency: '',
      date: new Date().toISOString().split('T')[0],
      linePlans: [],
      lineActuals: [],
    });
  };

  // Delete functions
  const deleteDefectEntry = (id: string) => {
    setDefectEntries(defectEntries.filter(entry => entry.id !== id));
  };

  const deleteProductEntry = (id: string) => {
    setProductEntries(productEntries.filter(entry => entry.id !== id));
  };

  const deleteSummaryEntry = (id: string) => {
    setSummaryEntries(summaryEntries.filter(entry => entry.id !== id));
  };

  const getLineActualTotal = (lineId: number) =>
    productEntries.reduce((sum, pe) => {
      return String(pe.lineNumber) === String(lineId)
        ? sum + Number(pe.totalTyre)
        : sum;
    }, 0);

  // Submit all records
  const submitAllRecords = async () => {
    if (productEntries.length === 0) {
      alert('Please add at least one Total Product Entry before submitting.');
      return;
    }

    const allRequiredPlansFilled = lines.length > 0 && lines.every((line, i) => {
      const actual = getLineActualTotal(line.id);
      if (!actual || actual === 0) return true; // no actuals for this line -> plan not required
      const val = summaryForm.linePlans[i];
      return val !== undefined && val !== '' && Number(val) > 0;
    });
    if (!allRequiredPlansFilled) {
      alert('Please fill in the Plan value for production lines that have Actual production in the Production Summary.');
      return;
    }

    const shift = summaryForm.shift || (shifts[0]?.name ?? "Morning");
    const productionDateIso = new Date(summaryForm.date).toISOString();

    const lookupMetaId = (list: MetaItem[], value: string | number): number => {
      const match = list.find(
        (m) => String(m.id) === String(value) || String(m.name) === String(value)
      );
      return match?.id ?? 0;
    };

    const payload = lines.map((line, i) => {
      const plannedTotalTyres = Number(summaryForm.linePlans[i] || 0);
      const actualTotalTyres = getLineActualTotal(line.id);

      const productEntriesForLine = productEntries.filter((pe) => {
        return String(pe.lineNumber) === String(line.id);
      });

      const tyreItemsForLine = defectEntries.filter((de) => {
        return String(de.productionLine) === String(line.id);
      });

      return {
        lineNumberId: line.id,
        shift,
        productionDate: productionDateIso,
        createdBy,
        plannedTotalTyres,
        actualTotalTyres,
        productEntries: productEntriesForLine.map((pe) => {
          const tyreTypeId = Number(pe.productType);
          return {
            tyreTypeId: Number.isFinite(tyreTypeId) && tyreTypeId > 0
              ? tyreTypeId
              : lookupMetaId(tyreItems, pe.productType),
            totalProduction: Number(pe.totalTyre),
          };
        }),
        tyreItems: tyreItemsForLine.map((de) => {
          const tyreTypeIdFromEntry = Number(de.tyreItem);
          const moldNumberIdFromEntry = Number(de.moldNumber);

          const matchingProductEntry = productEntriesForLine.find((pe) =>
            String(pe.productType) === String(de.tyreItem) ||
            String(pe.productType) === String(lookupMetaId(tyreItems, de.tyreItem))
          );

          return {
            serialNumber: de.serialNumber,
            operatorNumber: Number(de.operatorNumber) || 0,
            userId,
            createdBy,
            defect: de.defect,
            cOrD: de.defectClass || "C",
            tyreTypeId:
              Number.isFinite(tyreTypeIdFromEntry) && tyreTypeIdFromEntry > 0
                ? tyreTypeIdFromEntry
                : lookupMetaId(tyreItems, de.tyreItem),
            moldNumberId:
              Number.isFinite(moldNumberIdFromEntry) && moldNumberIdFromEntry > 0
                ? moldNumberIdFromEntry
                : lookupMetaId(moldNumbers, de.moldNumber),
            totalProduction: matchingProductEntry ? Number(matchingProductEntry.totalTyre) : 1,
          };
        }),
      };
    });

    try {
      const resp = await batchCreateProductionRecords(payload);
      console.log("Batch create response", resp);
      alert("Submitted successfully.");
      setDefectEntries([]);
      setProductEntries([]);
      setSummaryEntries([]);
    } catch (err: any) {
      console.error("Batch create failed", err);
      alert(`Failed to submit records: ${err?.message ?? err}`);
    }
  };

  const totalEntries = defectEntries.length + productEntries.length + summaryEntries.length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Grading & Data Entry</h1>
        <p className="text-gray-600 mt-2">Enter production data, defects, and summaries</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('defects')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'defects'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Defect Entry
              {defectEntries.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {defectEntries.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Total Product Entry
              {productEntries.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {productEntries.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Production Summary
              {summaryEntries.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {summaryEntries.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Defect Entry Tab */}
          {activeTab === 'defects' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Defect Entry</h3>
              {metaLoading && (
                <p className="text-sm text-gray-500 mb-4">Loading metadata…</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

                {/* Date */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-gray-400 shrink-0" />
                    <input
                      type="date"
                      value={defectForm.date}
                      onChange={(e) => setDefectForm({ ...defectForm, date: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Tyre Item */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tyre Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defectForm.tyreItem}
                    onChange={(e) => setDefectForm({ ...defectForm, tyreItem: e.target.value })}
                    onClick={() => console.log('tyreItems', tyreItems, 'length', tyreItems.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Tyre Item</option>
                    {tyreItems.map(item => (
                      <option key={item.id} value={String(item.id)} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

                {/* Production Line */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Line <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defectForm.productionLine}
                    onChange={(e) => setDefectForm({ ...defectForm, productionLine: e.target.value })}
                    onClick={() => console.log('lines', lines, 'length', lines.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Production Line</option>
                    {lines.map(item => (
                      <option key={item.id} value={String(item.id)} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={defectForm.serialNumber}
                    onChange={(e) => setDefectForm({ ...defectForm, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter serial number"
                  />
                </div>

                {/* Mold Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mold Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defectForm.moldNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDefectForm({ ...defectForm, moldNumber: value });
                      console.log('moldNumbers array', moldNumbers);
                      const selected = moldNumbers.find(m => String(m.id) === value || m.name === value);
                      console.log('selected moldNumber object', selected);
                    }}
                    onClick={() => console.log('moldNumbers', moldNumbers, 'length', moldNumbers.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Mold Number</option>
                    {moldNumbers.map(item => (
                      <option key={item.id} value={item.name} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

                {/* Shift */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defectForm.shift}
                    onChange={(e) => setDefectForm({ ...defectForm, shift: e.target.value })}
                    onClick={() => console.log('shifts', shifts, 'length', shifts.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Shift</option>
                    {shifts.map(item => (
                      <option key={item.id} value={item.name} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

                {/* Defect + C/D classification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Defect <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defectForm.defect}
                    onChange={(e) => setDefectForm({ ...defectForm, defect: e.target.value })}
                    onClick={() => console.log('defects', defects, 'length', defects.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Defect</option>
                    {defects.map(item => (
                      <option key={item.id} value={item.name} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={defectForm.defectClass === 'C'}
                        onChange={() => setDefectForm({ ...defectForm, defectClass: defectForm.defectClass === 'C' ? '' : 'C' })}
                        className="w-4 h-4 accent-blue-600"
                      />
                      C
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={defectForm.defectClass === 'D'}
                        onChange={() => setDefectForm({ ...defectForm, defectClass: defectForm.defectClass === 'D' ? '' : 'D' })}
                        className="w-4 h-4 accent-blue-600"
                      />
                      D
                    </label>
                  </div>
                </div>

                {/* Operator Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operator Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defectForm.operatorNumber}
                    onChange={(e) => setDefectForm({ ...defectForm, operatorNumber: e.target.value })}
                    onClick={() => console.log('operators', operators, 'length', operators.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Operator</option>
                    {operators.map(item => (
                      <option key={item.id} value={item.name} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Save & Clear buttons */}
              <div className="flex gap-3 justify-end mb-4">
                <button
                  onClick={() => setDefectForm(EMPTY_DEFECT_FORM)}
                  className="flex items-center gap-2 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X size={16} /> Clear
                </button>
                <button
                  onClick={addDefectEntry}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Save size={16} /> Save
                </button>
              </div>

              {/* Defect Entries Table */}
              {defectEntries.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Saved Entries ({defectEntries.length})</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tyre Item</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Line</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Serial No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mold No.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Shift</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Defect</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Class</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Operator</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {defectEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.date}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{getMetaName(tyreItems, entry.tyreItem)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{getMetaName(lines, entry.productionLine)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.serialNumber}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{getMetaName(moldNumbers, entry.moldNumber)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.shift}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.defect}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.defectClass === 'C' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {entry.defectClass}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.operatorNumber}</td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => deleteDefectEntry(entry.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Entry Tab */}
          {activeTab === 'products' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Product Entry</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tyre Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productForm.productType}
                    onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                    onClick={() => console.log('tyreItems', tyreItems, 'length', tyreItems.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Tyre Type</option>
                    {tyreItems.map(item => (
                      <option key={item.id} value={String(item.id)} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Production Line <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productForm.lineNumber}
                    onChange={(e) => setProductForm({ ...productForm, lineNumber: e.target.value })}
                    onClick={() => console.log('lines', lines, 'length', lines.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Line Number</option>
                    {lines.map(item => (
                      <option key={item.id} value={String(item.id)} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shift <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productForm.shift}
                    onChange={(e) => setProductForm({ ...productForm, shift: e.target.value })}
                    onClick={() => console.log('shifts', shifts, 'length', shifts.length, 'metaLoading', metaLoading)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Shift</option>
                    {shifts.map(item => (
                      <option key={item.id} value={item.name} style={{ color: '#111827' }}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Tyre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={productForm.totalTyre}
                    onChange={(e) => setProductForm({ ...productForm, totalTyre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter total tyres"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={addProductEntry}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Add to List
                  </button>
                </div>
              </div>

              {/* Product Entries Table */}
              {productEntries.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Saved Entries ({productEntries.length})</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Line</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total Tyre</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Shift</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {productEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{getMetaName(lines, entry.lineNumber)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{getMetaName(tyreItems, entry.productType)}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.totalTyre}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.shift}</td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => deleteProductEntry(entry.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Entry Tab */}
            {/* Summary Entry Tab */}
          {activeTab === 'summary' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Summary</h3>

              {/* Production Summary Table */}
              <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-600">
                      <th colSpan={lines.length + 2} className="px-4 py-3 text-left text-white font-bold text-lg">
                        PRODUCTION SUMMARY
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 border-r border-gray-300"></th>
                      {lines.map((line) => (
                        <th key={line.id} className="px-4 py-3 text-center font-semibold text-gray-900 border-r border-gray-300">{line.name}</th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold text-gray-900 bg-blue-50">SUMMARY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* PLAN Row */}
                    <tr className="border-t border-gray-300">
                      <td className="px-4 py-3 font-semibold text-gray-900 bg-gray-50 border-r border-gray-300">PLAN</td>
                      {lines.map((line, i) => (
                        <td key={line.id} className="px-2 py-2 border-r border-gray-300">
                          <input
                            type="number"
                            value={summaryForm.linePlans[i] ?? ''}
                            onChange={(e) => {
                              const next = [...summaryForm.linePlans];
                              next[i] = e.target.value;
                              setSummaryForm({ ...summaryForm, linePlans: next });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-center"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 bg-blue-50">
                        {lines.length > 0 ? lines.reduce((sum, _, i) => sum + Number(summaryForm.linePlans[i] || 0), 0) : '-'}
                      </td>
                    </tr>

                    {/* ACTUAL Row */}
                    <tr className="border-t border-gray-300">
                      <td className="px-4 py-3 font-semibold text-gray-900 bg-gray-50 border-r border-gray-300">ACTUAL</td>
                      {lines.map((line) => (
                        <td key={line.id} className="px-2 py-2 border-r border-gray-300">
                          <span className="w-full px-3 py-2 text-center font-semibold text-gray-900 block">
                            {getLineActualTotal(line.id)}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 bg-blue-50">
                        {lines.length > 0 ? lines.reduce((sum, line) => sum + getLineActualTotal(line.id), 0) : '-'}
                      </td>
                    </tr>

                    {/* EFFICIENCY Row */}
                    <tr className="border-t border-gray-300">
                      <td className="px-4 py-3 font-semibold text-gray-900 bg-gray-50 border-r border-gray-300">EFFICIENCY</td>
                      {lines.map((line, i) => {
                        const plan = Number(summaryForm.linePlans[i] || 0);
                        const actual = getLineActualTotal(line.id);
                        const eff = plan > 0 ? (actual / plan) * 100 : 0;
                        return (
                          <td key={line.id} className="px-4 py-3 text-center border-r border-gray-300">
                            {plan > 0 ? (
                              <span className={`font-semibold ${
                                eff >= 90 ? 'text-green-600' : eff >= 75 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {eff.toFixed(1)}%
                              </span>
                            ) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center bg-blue-50">
                        {lines.length > 0 && (
                          (() => {
                            const summaryPlan = lines.reduce((s, _, i) => s + Number(summaryForm.linePlans[i] || 0), 0);
                            const summaryActual = lines.reduce((s, line) => s + getLineActualTotal(line.id), 0);
                            if (summaryPlan === 0) return '-';
                            const summaryEff = (summaryActual / summaryPlan) * 100;
                            return <span className={`font-semibold ${summaryEff >= 90 ? 'text-green-600' : summaryEff >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{summaryEff.toFixed(1)}%</span>;
                          })()
                        )}
                        {lines.length === 0 && '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Entries Table */}
              {summaryEntries.length > 0 && (
                <div className="mt-6">
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {lines.map((line) => (
                            <th key={line.id} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase" colSpan={3}>{line.name}</th>
                          ))}
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase" colSpan={3}>Summary</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                        </tr>
                        <tr className="bg-gray-100">
                          {lines.map((line) => (
                            <React.Fragment key={line.id}>
                              <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Plan</th>
                              <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Actual</th>
                              <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Eff%</th>
                            </React.Fragment>
                          ))}
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Plan</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Actual</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-600">Eff%</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {summaryEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            {lines.map((line, i) => (
                              <React.Fragment key={line.id}>
                                <td className="px-2 py-3 text-sm text-center text-gray-900">{entry.linePlans[i] ?? '-'}</td>
                                <td className="px-2 py-3 text-sm text-center text-gray-900">{entry.lineActuals[i] ?? '-'}</td>
                                <td className="px-2 py-3 text-sm text-center">
                                  <span className={`font-semibold ${
                                    (entry.lineEfficiencies[i] ?? 0) >= 90 ? 'text-green-600' : 
                                    (entry.lineEfficiencies[i] ?? 0) >= 75 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {(entry.lineEfficiencies[i] ?? 0).toFixed(1)}%
                                  </span>
                                </td>
                              </React.Fragment>
                            ))}
                            <td className="px-2 py-3 text-sm text-center font-semibold text-gray-900 bg-blue-50">{entry.summaryPlan}</td>
                            <td className="px-2 py-3 text-sm text-center font-semibold text-gray-900 bg-blue-50">{entry.summaryActual}</td>
                            <td className="px-2 py-3 text-sm text-center bg-blue-50">
                              <span className={`font-semibold ${
                                entry.summaryEfficiency >= 90 ? 'text-green-600' : 
                                entry.summaryEfficiency >= 75 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {entry.summaryEfficiency.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => deleteSummaryEntry(entry.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit All Section */}
      {totalEntries > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready to Submit</h3>
              <p className="text-sm text-gray-600">
                You have <span className="font-semibold text-blue-600">{totalEntries}</span> total entries ready to submit
                ({defectEntries.length} defects, {productEntries.length} products, {summaryEntries.length} summaries)
              </p>
            </div>
            <button
              onClick={submitAllRecords}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
            >
              <CheckCircle size={20} />
              Submit All Records
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default Grading;