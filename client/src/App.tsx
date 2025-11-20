import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filters } from "./components/Filters";
import { LogTable } from "./components/LogTable";
import { Toolbar } from "./components/Toolbar";
import { deleteLog, fetchLogs } from "./lib/api";
import { LogItem } from "./types";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { RefreshCcw } from "lucide-react";

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
        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">poslog.store</p>
            <h1 className="text-3xl font-semibold">External Logger</h1>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            즉시 새로고침
          </Button>
        </header>

        <Card>
          <Toolbar
            autoRefresh={autoRefresh}
            intervalMs={intervalMs}
            onIntervalChange={setIntervalMs}
            onToggleRefresh={() => setAutoRefresh((v) => !v)}
            onRefresh={() => refetch()}
            autoScroll={autoScroll}
            onToggleScroll={() => setAutoScroll((v) => !v)}
          />
        </Card>

        <Card>
          <Filters
            value={filters}
            onChange={setFilters}
            onReset={() => setFilters(initialFilters)}
          />
        </Card>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {isFetching ? "불러오는 중..." : data ? `${data.items.length} logs` : "-"}
          </span>
          {isError && <span className="text-red-400">에러: 데이터를 불러오지 못했습니다.</span>}
        </div>

        <div ref={listRef} className="space-y-3 pb-12">
          {isLoading && <p className="text-sm text-slate-400">로딩 중...</p>}
          {!isLoading && data && data.items.length === 0 && (
            <p className="text-sm text-slate-400">로그가 없습니다.</p>
          )}
          {data && (
            <LogTable
              items={data.items}
              onCopy={handleCopy}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
