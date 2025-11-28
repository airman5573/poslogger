import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download, File, HardDrive, RefreshCcw, Trash2, Upload } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { SnackbarContainer, useSnackbar } from "../components/ui/snackbar";
import {
  deleteFile,
  fetchAuthStatus,
  fetchFiles,
  FileInfo,
  getDownloadUrl,
  HttpError,
  login,
  logout,
  refreshAuth,
  uploadFileWithProgress,
  UploadProgress,
} from "../lib/api";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Drive() {
  const [password, setPassword] = useState("");
  const [now, setNow] = useState(Date.now());
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [snackbars, showSnackbar, removeSnackbar] = useSnackbar();

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
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-status"] });
      queryClient.removeQueries({ queryKey: ["files"] });
    },
  });

  const refreshAuthMutation = useMutation({
    mutationFn: () => refreshAuth(),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth-status"], data);
    },
    onError: (err) => {
      if (err instanceof HttpError && err.status === 401) {
        queryClient.setQueryData(["auth-status"], { authenticated: false });
      }
    },
  });

  const { data: filesData, isLoading: isFilesLoading, refetch } = useQuery({
    queryKey: ["files"],
    queryFn: fetchFiles,
    enabled: isAuthenticated,
  });

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadFileName(file.name);
    setUploadProgress({ loaded: 0, total: file.size, percent: 0 });

    try {
      await uploadFileWithProgress(file, (progress) => {
        setUploadProgress(progress);
      });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showSnackbar("업로드 완료", "success");
    } catch (err) {
      showSnackbar("업로드 실패", "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setUploadFileName("");
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => deleteFile(filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showSnackbar("삭제 완료", "success");
    },
    onError: () => {
      showSnackbar("삭제 실패", "error");
    },
  });

  const handleLoginSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) return;
    loginMutation.mutate(trimmed);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDelete = (filename: string) => {
    if (window.confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(filename);
    }
  };

  const handleDownload = (file: FileInfo) => {
    const url = getDownloadUrl(file.name);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sessionRemainingMs = authStatus?.expiresAt
    ? Math.max(authStatus.expiresAt - now, 0)
    : null;
  const sessionRemainingText =
    sessionRemainingMs !== null
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
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
              poslog.store
            </p>
            <h1 className="text-2xl font-semibold text-slate-50">
              Drive 접근은 보호되어 있어요
            </h1>
            <p className="text-sm text-slate-400">
              비밀번호를 입력하면 파일을 업로드하고 다운로드할 수 있어요.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="drive-password" className="text-sm text-slate-200">
                접속 비밀번호
              </label>
              <input
                id="drive-password"
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
              {loginMutation.isPending ? "확인 중..." : "Drive 열기"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
              로그 뷰어로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-sky-500/30">
      {/* Header */}
      <header className="flex-none border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <HardDrive className="h-6 w-6 text-sky-400" />
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-slate-100">Drive</h1>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                poslog.store
              </span>
            </div>
            {sessionRemainingText && (
              <Badge className="ml-2 bg-slate-800 text-slate-200 border border-slate-700">
                {sessionRemainingText}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="outline" size="sm">
                로그 뷰어
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAuthMutation.mutate()}
              disabled={refreshAuthMutation.isPending}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              {refreshAuthMutation.isPending ? "갱신 중..." : "토큰 갱신"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              로그아웃
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Upload Area */}
        <div
          className={`mb-6 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-sky-500 bg-sky-500/10"
              : isUploading
              ? "border-sky-500/50 bg-sky-500/5"
              : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isUploading ? (
            <>
              <div className="mb-4">
                <div className="text-sky-400 font-medium mb-1">{uploadFileName}</div>
                <div className="text-slate-400 text-sm">
                  {uploadProgress && (
                    <>
                      {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
                    </>
                  )}
                </div>
              </div>
              <div className="w-full max-w-md mx-auto mb-3">
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress?.percent ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold text-sky-400">
                {uploadProgress?.percent ?? 0}%
              </div>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-10 w-10 text-slate-500 mb-3" />
              <p className="text-slate-400 mb-3">
                파일을 여기에 드래그하거나 클릭해서 업로드하세요 (최대 500MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()}>
                파일 선택
              </Button>
            </>
          )}
        </div>

        {/* File List */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-200">파일 목록</h2>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>

          {isFilesLoading ? (
            <div className="p-8 text-center text-slate-500">로딩 중...</div>
          ) : filesData?.files.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <File className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>파일이 없습니다</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-2">파일명</th>
                  <th className="px-4 py-2 w-28">크기</th>
                  <th className="px-4 py-2 w-44">수정일</th>
                  <th className="px-4 py-2 w-28 text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {filesData?.files.map((file) => (
                  <tr
                    key={file.name}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-200">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {formatDate(file.modifiedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          title="다운로드"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.name)}
                          disabled={deleteMutation.isPending}
                          title="삭제"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Status Bar */}
      <div className="flex-none border-t border-slate-800 bg-slate-900/90 px-4 py-1.5 text-[11px] text-slate-400 backdrop-blur">
        <div className="flex items-center justify-between">
          <span>
            총 {filesData?.files.length ?? 0}개 파일
          </span>
          {sessionRemainingText && (
            <span>세션: {sessionRemainingText}</span>
          )}
        </div>
      </div>

      <SnackbarContainer snackbars={snackbars} onRemove={removeSnackbar} />
    </div>
  );
}
