import { LogItem } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { LogContextViewer } from "./LogContextViewer";
import { cn } from "../lib/utils";
import { Copy, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import React, { useState } from "react";

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

function LogRow({ item, onDelete, onCopy }: { item: LogItem; onDelete: (id: number) => void; onCopy: (item: LogItem) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr 
        className={cn(
          "group border-b border-slate-800 transition-colors hover:bg-slate-900/40",
          expanded && "bg-slate-900/60"
        )}
      >
        <td className="p-3 align-top">
          <Badge tone={levelTone(item.level)} className="whitespace-nowrap">
            {item.level}
          </Badge>
        </td>
        <td className="p-3 align-top text-xs text-slate-400 whitespace-nowrap">
          {new Date(item.timestamp).toLocaleString()}
        </td>
        <td className="p-3 align-top">
          <div className="flex flex-col gap-1">
             {item.label && <span className="inline-flex items-center rounded bg-slate-800 px-1.5 py-0.5 text-xs font-medium text-slate-300 w-fit">{item.label}</span>}
             {item.source && <span className="text-xs text-slate-500">{item.source}</span>}
          </div>
        </td>
        <td className="p-3 align-top min-w-[300px]">
          <div className="flex items-start gap-2">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="mt-0.5 text-slate-500 hover:text-slate-300 focus:outline-none"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <span 
              className="text-sm text-slate-200 break-all font-mono cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              {item.message}
            </span>
          </div>
        </td>
        <td className="p-3 align-top text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopy(item)} title="Copy JSON">
              <Copy className="h-4 w-4 text-slate-400" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(item.id)} title="Delete">
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-900/30">
          <td colSpan={5} className="p-0">
            <div className="border-b border-slate-800 px-4 py-2 pl-12">
               <LogContextViewer context={item.context} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function LogTable({ items, onDelete, onCopy }: Props) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/50 shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-xs font-medium uppercase text-slate-500">
          <tr>
            <th className="p-3 w-20">Level</th>
            <th className="p-3 w-48">Time</th>
            <th className="p-3 w-32">Source</th>
            <th className="p-3">Message</th>
            <th className="p-3 w-24 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {items.map((item) => (
            <LogRow key={item.id} item={item} onDelete={onDelete} onCopy={onCopy} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
