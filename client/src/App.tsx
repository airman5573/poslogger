import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filters } from "./components/Filters";
import { LogTable } from "./components/LogTable";
import { Toolbar } from "./components/Toolbar";
import { deleteAllLogs, deleteLog, fetchAuthStatus, fetchLogs, HttpError, login, logout } from "./lib/api";
import { LogItem } from "./types";
import { Badge } from "./components/ui/badge";
import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "./components/ui/button";

type FiltersState = {
  levels: string[];
  labels: string[];
  sources: string[];
  q: string;
  start: string;
  end: string;
  limit: number;
};

const createInitialFilters = (): FiltersState => ({
  levels: ["ERROR", "WARN", "INFO", "DEBUG"],
  labels: [],
  sources: [],
  q: "",
  start: "",
  end: "",
  limit: 200,
});

function App() {
  const [filters, setFilters] = useState<FiltersState>(() => createInitialFilters());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalMs, setIntervalMs] = useState(1000);
  const [autoScroll, setAutoScroll] = useState(true);
  const [password, setPassword] = useState("");
  const [now, setNow] = useState(Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  const { data: authStatus, isLoading: isAuthLoading } = useQuery({
    queryKey: ["auth-status"],
    queryFn: fetchAuthStatus,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (authStatus?.authenticated) {
      setPassword("");
    }
  }, [authStatus?.authenticated]);

  const isAuthenticated = Boolean(authStatus?.authenticated);

  const loginMutation = useMutation({
    mutationFn: (pwd: string) => login(pwd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      queryClient.removeQueries({ queryKey: ["logs"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      queryClient.removeQueries({ queryKey: ["logs"] });
    },
  });

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
    refetchInterval: isAuthenticated && autoRefresh ? intervalMs : false,
    placeholderData: (prev) => prev,
    enabled: isAuthenticated,
    onError: (err) => {
      if (err instanceof HttpError && err.status === 401) {
        queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      }
    },
  });

  const displayItems = useMemo(() => (data?.items ? [...data.items].reverse() : []), [data?.items]);

  useEffect(() => {
    if (!autoScroll || displayItems.length === 0) return;

    requestAnimationFrame(() => {
      const container = listRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    });
  }, [displayItems, autoScroll]);

  const queryClient = useQueryClient();

  const handleReset = () => {
    const defaults = createInitialFilters();
    setFilters(defaults);
    // Ensure a new fetch even if state already matches defaults.
    queryClient.invalidateQueries({ queryKey: ["logs"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["logs"] }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllLogs(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["logs"] }),
  });

  const handleCopy = async (item: LogItem) => {
    const text = JSON.stringify(item, null, 2);
    await navigator.clipboard.writeText(text);
  };

  const handleDeleteAll = () => {
    const confirmed = window.confirm("모든 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) return;
    deleteAllMutation.mutate();
  };

  const handleLoginSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) return;
    loginMutation.mutate(trimmed);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const sessionRemainingMs = authStatus?.expiresAt
    ? Math.max(authStatus.expiresAt - now, 0)
    : null;
  const sessionRemainingText = sessionRemainingMs !== null
    ? sessionRemainingMs <= 0
      ? "만료됨"
      : `만료까지 ${Math.ceil(sessionRemainingMs / 60000)}분`
    : null;

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-5 text-sm text-slate-300 shadow-lg">
          접근 권한을 확인하는 중입니다...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">poslog.store</p>
            <h1 className="text-2xl font-semibold text-slate-50">로그 보기는 보호되어 있어요</h1>
            <p className="text-sm text-slate-400">
              비밀번호를 한 번만 입력하면 15분 동안 유지돼요. 공개 주소지만 내부자만 접근할 수 있도록 잠궈두었습니다.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="poslog-password" className="text-sm text-slate-200">접속 비밀번호</label>
              <input
                id="poslog-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {loginMutation.isError && (
              <p className="text-sm text-red-400">비밀번호가 올바르지 않습니다.</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || password.trim() === ""}
            >
              {loginMutation.isPending ? "확인 중..." : "로그 보기"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-slate-500">
            세션은 15분 간 유지되며, 브라우저를 닫으면 자동으로 만료됩니다.
          </p>
        </div>
      </div>
    );
  }

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
              <Badge id="app-version-badge" className="ml-2 border border-slate-700 text-slate-400 bg-slate-900">
                v1.0
              </Badge>
              {sessionRemainingText && (
                <Badge className="ml-2 bg-slate-800 text-slate-200 border border-slate-700">
                  {sessionRemainingText}
                </Badge>
              )}
            </div>

            <div id="header-actions" className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="shadow-sm"
              >
                로그아웃
              </Button>

              <Button
                id="log-table-section-delete-all-button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                disabled={deleteAllMutation.isPending}
                className="shadow-sm"
              >
                <Trash2 id="log-table-section-delete-all-icon" className="h-4 w-4 mr-1.5" />
                모든 로그 삭제
              </Button>

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
          </div>

          <Filters
            id="filters-panel"
            value={filters}
            onChange={setFilters}
            onReset={handleReset}
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
              <AlertCircle id="error-state-icon" className="h-5 w-5" />
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
              items={displayItems}
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
          <div className="flex items-center gap-4">
            {sessionRemainingText && (
              <div id="status-session" className="text-slate-300">
                세션: <span className="text-slate-100 font-medium">{sessionRemainingText}</span>
              </div>
            )}
            <div id="status-connection" className="flex items-center gap-2">
              <div
                id="status-indicator"
                className={`h-1.5 w-1.5 rounded-full ${isFetching ? 'bg-sky-400 animate-pulse' : 'bg-emerald-500'}`}
              />
              <span id="status-text">{isFetching ? "Syncing..." : "Connected"}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
