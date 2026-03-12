import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "../auth/useAuth";
import {
  fetchAllMetadata,
  MetaData,
  MetaItem,
} from "../services/metaService";

const STORAGE_KEY = "app_metadata";

interface MetaContextValue extends MetaData {
  loading: boolean;
  reload: () => void;
}

const defaultMeta: MetaData = {
  tyreItems: [],
  lines: [],
  moldNumbers: [],
  shifts: [],
  defects: [],
  operators: [],
};

const MetaContext = createContext<MetaContextValue>({
  ...defaultMeta,
  loading: true,
  reload: () => {},
});

function loadFromStorage(): MetaData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeMeta(parsed);
  } catch {
    return null;
  }
}

function normalizeMeta(data: any): MetaData {
  if (!data) return defaultMeta;
  const map = (arr: any[]) =>
    (Array.isArray(arr) ? arr : []).map((it: any) => {
      const id = it?.id ?? it?.ID ?? it?.Id ?? 0;
      const name =
        it?.moldNumber ??
        it?.mold_number ??
        it?.operatorNumber ??
        it?.operator_number ??
        it?.operatorName ??
        it?.operator_name ??
        it?.shiftName ??
        it?.shift_name ??
        it?.defectName ??
        it?.defect_name ??
        it?.name ??
        it?.lineNumber ??
        it?.line_number ??
        (it?.partNumber ? `${it.partNumber} - ${it?.tyreItem ?? ''}`.trim() : undefined) ??
        it?.tyreItem ??
        it?.part_number ??
        it?.label ??
        String(id);
      return { id: Number(id), name } as MetaItem;
    });

  return {
    tyreItems: map(data.tyreItems ?? data.tyres ?? []),
    lines: map(data.lines ?? data.lineNumbers ?? []),
    moldNumbers: map(data.moldNumbers ?? data.molds ?? []),
    shifts: map(data.shifts ?? []),
    defects: map(data.defects ?? []),
    operators: map(data.operators ?? []),
  };
}

function saveToStorage(data: MetaData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage quota or serialization failure — silent
  }
}

export function MetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<MetaData>(
    () => loadFromStorage() ?? defaultMeta
  );
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAllMetadata()
      .then((data) => {
        setMeta(data);
        saveToStorage(data);
      })
      .finally(() => setLoading(false));
  };

  const { isAuthenticated } = useAuth();

  // Load metadata on mount and whenever auth state changes (so data fetches after login)
  useEffect(() => {
    load();
  }, [isAuthenticated]);

  return (
    <MetaContext.Provider value={{ ...meta, loading, reload: load }}>
      {children}
    </MetaContext.Provider>
  );
}

export function useMeta(): MetaContextValue {
  return useContext(MetaContext);
}

export type { MetaData, MetaItem };

