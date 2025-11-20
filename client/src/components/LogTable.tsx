import { LogItem } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { LogContextViewer } from "./LogContextViewer";
import { cn } from "../lib/utils";
import { Copy, Trash2 } from "lucide-react";
import React from "react";

type Props = {
  items: LogItem[];
  onDelete: (id: number) => void;
  onCopy: (item: LogItem) => void;
};

const levelTone = (level: string): NonNullable<Parameters<typeof Badge>[0]["tone"]> => {
  const upper = level.toUpperCase();
  if (upper === "ERROR" || upper === "FATAL") return "error";
  if (upper === "WARN" || upper === "WARNING") return "warn";
  if (upper === "DEBUG") return "debug";
  return "default";
};

export function LogTable({ items, onDelete, onCopy }: Props) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={levelTone(item.level)}>{item.level}</Badge>
            <span className="text-sm text-slate-300">{item.label}</span>
            {item.source && <span className="text-xs text-slate-500">{item.source}</span>}
            <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onCopy(item)} title="Copy log">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                title="Delete log"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
          </div>
          </div>
          <p className={cn("mt-3 text-sm leading-relaxed text-slate-100 break-words")}>
            {item.message}
          </p>
          <LogContextViewer context={item.context} />
        </div>
      ))}
    </div>
  );
}
