import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filters } from "./components/Filters";
import { LogTable } from "./components/LogTable";
import { Toolbar } from "./components/Toolbar";
import { deleteLog, fetchLogs } from "./lib/api";
import { LogItem } from "./types";
import { Badge } from "./components/ui/badge";
import { AlertCircle } from "lucide-react";

type FiltersState = {
  levels: string[];
  labels: string[];
  sources: string[];
  q: string;
  start: string;
  end: string;
  limit: number;
};

const initialFilters: FiltersState = {
  levels: ["ERROR", "WARN", "INFO", "DEBUG"],
  labels: [],
  sources: [],
  q: "",
  start: "",
  end: "",
  limit: 200,
};

function App() {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalMs, setIntervalMs] = useState(3000);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const queryKey = useMemo(() => ["logs", filters], [filters]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchLogs({
        levels: filters.levels,
        labels: filters.labels,
        sources: filters.sources,
        start: filters.start,
        end: filters.end,
        q: filters.q,
        limit: filters.limit,
        offset: 0,
      }),
    refetchInterval: autoRefresh ? intervalMs : false,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (autoScroll && data?.items?.length) {
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }
  }, [data, autoScroll]);

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["logs"] }),
  });

  const handleCopy = async (item: LogItem) => {
    const text = JSON.stringify(item, null, 2);
    await navigator.clipboard.writeText(text);
  };

  return (
    <div id="app-container" className="flex h-screen flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-sky-500/30">
      {/* Header Section */}
      <header id="app-header" className="flex-none border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-50">
        <div id="header-content" className="flex flex-col gap-4 px-6 py-4">
          <div id="header-top-row" className="flex items-center justify-between">
            <div id="brand-block" className="flex items-center gap-3">
              <div id="brand-text" className="flex flex-col">
                <h1 id="app-title" className="text-lg font-bold tracking-tight text-slate-100">External Logger</h1>
                <span id="app-subtitle" className="text-[10px] uppercase tracking-wider text-slate-500">poslog.store</span>
              </div>
              <Badge id="app-version-badge" variant="outline" className="ml-2 border-slate-700 text-slate-400">
                v1.0
              </Badge>
            </div>
            
            <Toolbar
              id="toolbar-controls"
              autoRefresh={autoRefresh}
              intervalMs={intervalMs}
              onIntervalChange={setIntervalMs}
              onToggleRefresh={() => setAutoRefresh((v) => !v)}
              onRefresh={() => refetch()}
              autoScroll={autoScroll}
              onToggleScroll={() => setAutoScroll((v) => !v)}
            />
          </div>

          <Filters
            id="filters-panel"
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters(initialFilters)}
          />
        </div>
      </header>

      {/* Main Log Area */}
      <main id="log-area" className="flex-1 overflow-hidden relative bg-slate-950">
        <div
          id="log-scroll-container"
          ref={listRef}
          className="h-full w-full overflow-auto p-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          {isLoading && !data && (
            <div id="loading-state" className="flex h-full items-center justify-center text-slate-500">
              <span id="loading-state-text">Loading logs...</span>
            </div>
          )}
          
          {isError && (
            <div id="error-state" className="flex h-full items-center justify-center text-red-400 gap-2">
              <AlertCircle className="h-5 w-5" />
              <span id="error-state-text">Failed to load logs</span>
            </div>
          )}

          {!isLoading && data && data.items.length === 0 && (
            <div id="empty-state" className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
              <div id="empty-state-icon" className="text-4xl">📭</div>
              <p id="empty-state-text">No logs found matching your filters.</p>
            </div>
          )}

          {data && data.items.length > 0 && (
            <LogTable
              id="log-table-section"
              items={data.items}
              onCopy={handleCopy}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </div>

        {/* Status Bar */}
        <div
          id="status-bar"
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-4 py-1.5 text-[11px] text-slate-400 backdrop-blur"
        >
          <div id="status-metrics" className="flex items-center gap-4">
            <span id="status-total">Total: <span id="status-total-value" className="text-slate-200 font-medium">{data?.total ?? 0}</span></span>
            <span id="status-showing">Showing: <span id="status-showing-value" className="text-slate-200 font-medium">{data?.items.length ?? 0}</span></span>
          </div>
          <div id="status-connection" className="flex items-center gap-2">
            <div
              id="status-indicator"
              className={`h-1.5 w-1.5 rounded-full ${isFetching ? 'bg-sky-400 animate-pulse' : 'bg-emerald-500'}`}
            />
            <span id="status-text">{isFetching ? "Syncing..." : "Connected"}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
