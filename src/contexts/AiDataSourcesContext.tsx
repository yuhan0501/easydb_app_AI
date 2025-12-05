import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

export interface AiDataSource {
  id: string;
  type: "file" | "mysql";
  path: string;
  alias: string;
  extension: string | null;
  readFunction?: string;
  sheetName: string | null;
  sheetOptions: string[];
  headers: string[];
  isLoading: boolean;
  error: string | null;
  connectionString?: string;
  tableAliases?: Record<string, string>;
}

interface AiDataSourcesContextValue {
  sources: AiDataSource[];
  setSources: React.Dispatch<React.SetStateAction<AiDataSource[]>>;
  updateSource: (id: string, patch: Partial<AiDataSource>) => void;
}

const AiDataSourcesContext = createContext<
  AiDataSourcesContextValue | undefined
>(undefined);

const STORAGE_KEY = "easydb_ai_sources";

function loadSources(): AiDataSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiDataSource[];
    return parsed.map((source) => ({
      ...source,
      type: source.type ?? "file",
      isLoading: false,
      tableAliases: source.tableAliases || {
        __default: source.alias,
      },
    }));
  } catch (error) {
    console.warn("Failed to parse AI sources", error);
    return [];
  }
}

export function AiDataSourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<AiDataSource[]>(() => loadSources());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    } catch (error) {
      console.warn("Failed to persist AI sources", error);
    }
  }, [sources]);

  const updateSource = useCallback(
    (id: string, patch: Partial<AiDataSource>) => {
      setSources((prev) =>
        prev.map((source) =>
          source.id === id ? { ...source, ...patch } : source
        )
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      sources,
      setSources,
      updateSource,
    }),
    [sources, updateSource]
  );

  return (
    <AiDataSourcesContext.Provider value={value}>
      {children}
    </AiDataSourcesContext.Provider>
  );
}

export function useAiDataSources() {
  const context = useContext(AiDataSourcesContext);
  if (!context) {
    throw new Error("useAiDataSources must be used within AiDataSourcesProvider");
  }
  return context;
}
