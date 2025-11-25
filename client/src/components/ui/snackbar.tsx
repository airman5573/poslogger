import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type SnackbarType = "success" | "error" | "info" | "warning";

type SnackbarProps = {
  message: string;
  type?: SnackbarType;
  duration?: number;
  onClose: () => void;
};

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const styleMap = {
  success: "bg-emerald-900/90 border-emerald-700 text-emerald-100",
  error: "bg-red-900/90 border-red-700 text-red-100",
  info: "bg-sky-900/90 border-sky-700 text-sky-100",
  warning: "bg-amber-900/90 border-amber-700 text-amber-100",
};

export function Snackbar({ message, type = "success", duration = 3000, onClose }: SnackbarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const Icon = iconMap[type];

  return (
    <div
      className={cn(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg backdrop-blur transition-all duration-200 min-w-[300px]",
        styleMap[type],
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={() => { setIsVisible(false); setTimeout(onClose, 200); }} className="ml-2 hover:opacity-70">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type SnackbarItem = {
  id: number;
  message: string;
  type: SnackbarType;
};

type SnackbarContextValue = {
  showSnackbar: (message: string, type?: SnackbarType) => void;
};

let snackbarId = 0;

export function useSnackbar(): [SnackbarItem[], SnackbarContextValue["showSnackbar"], (id: number) => void] {
  const [snackbars, setSnackbars] = useState<SnackbarItem[]>([]);

  const showSnackbar = (message: string, type: SnackbarType = "success") => {
    const id = ++snackbarId;
    setSnackbars((prev) => [...prev, { id, message, type }]);
  };

  const removeSnackbar = (id: number) => {
    setSnackbars((prev) => prev.filter((s) => s.id !== id));
  };

  return [snackbars, showSnackbar, removeSnackbar];
}

export function SnackbarContainer({ snackbars, onRemove }: { snackbars: SnackbarItem[]; onRemove: (id: number) => void }) {
  return (
    <>
      {snackbars.map((snackbar, index) => (
        <div key={snackbar.id} style={{ top: `calc(50% + ${index * 60}px)` }} className="fixed left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] min-w-[200px]">
          <Snackbar
            message={snackbar.message}
            type={snackbar.type}
            onClose={() => onRemove(snackbar.id)}
          />
        </div>
      ))}
    </>
  );
}
