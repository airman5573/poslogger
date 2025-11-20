import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import React from "react";
import { Search, Tag, Globe, Calendar, ListFilter, X } from "lucide-react";

const LEVELS = ["ERROR", "WARN", "INFO", "DEBUG", "LOG"];

type FiltersState = {
  levels: string[];
  labels: string[];
  sources: string[];
  q: string;
  start: string;
  end: string;
  limit: number;
};

type Props = {
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onReset: () => void;
};

export function Filters({ value, onChange, onReset }: Props) {
  const toggleLevel = (level: string) => {
    const has = value.levels.includes(level);
    const next = has ? value.levels.filter((l) => l !== level) : [...value.levels, level];
    onChange({ ...value, levels: next });
  };

  const updateField = <K extends keyof FiltersState>(key: K, v: FiltersState[K]) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="space-y-4">
      {/* Top Row: Search & Levels */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={value.q}
              onChange={(e) => updateField("q", e.target.value)}
              placeholder="검색 (메시지, 컨텍스트)"
              className="pl-9 bg-slate-950"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => toggleLevel(lvl)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  value.levels.includes(lvl)
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReset} className="text-slate-400 hover:text-white">
            <X className="mr-2 h-3 w-3" />
            초기화
          </Button>
        </div>
      </div>

      {/* Bottom Row: Detailed Filters */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="relative col-span-1">
           <Tag className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
           <Input
            placeholder="Label (콤마 구분)"
            value={value.labels.join(",")}
            onChange={(e) =>
              updateField(
                "labels",
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="relative col-span-1">
           <Globe className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
           <Input
            placeholder="Source (콤마 구분)"
            value={value.sources.join(",")}
            onChange={(e) =>
              updateField(
                "sources",
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
             className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="relative col-span-1">
           <Calendar className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
           <Input
            type="datetime-local"
            value={value.start}
            onChange={(e) => updateField("start", e.target.value)}
             className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="relative col-span-1">
           <Calendar className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
           <Input
            type="datetime-local"
            value={value.end}
            onChange={(e) => updateField("end", e.target.value)}
             className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="relative col-span-1">
           <ListFilter className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
           <Select
            value={String(value.limit)}
            onChange={(e) => updateField("limit", Number(e.target.value))}
            className="pl-8 h-8 text-xs"
          >
            {[50, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
