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
  id?: string;
  value: FiltersState;
  onChange: (next: FiltersState) => void;
  onReset: () => void;
};

export function Filters({ id, value, onChange, onReset }: Props) {
  const toggleLevel = (level: string) => {
    const has = value.levels.includes(level);
    const next = has ? value.levels.filter((l) => l !== level) : [...value.levels, level];
    onChange({ ...value, levels: next });
  };

  const updateField = <K extends keyof FiltersState>(key: K, v: FiltersState[K]) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div id={id ?? "filters-container"} className="space-y-4">
      {/* Top Row: Search & Levels */}
      <div id="filters-top-row" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div id="filters-search-levels" className="flex flex-1 items-center gap-2">
          <div id="filters-search-wrapper" className="relative flex-1 max-w-md">
            <Search id="filters-search-icon" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="filters-search-input"
              value={value.q}
              onChange={(e) => updateField("q", e.target.value)}
              placeholder="검색 (메시지, 컨텍스트)"
              className="pl-9 bg-slate-950"
            />
          </div>
          <div id="filters-level-group" className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                id={`filters-level-${lvl.toLowerCase()}`}
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
        
        <div id="filters-actions" className="flex items-center gap-2">
          <Button
            id="filters-reset-button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-slate-400 hover:text-white"
          >
            <X id="filters-reset-icon" className="mr-2 h-3 w-3" />
            초기화
          </Button>
        </div>
      </div>

      {/* Bottom Row: Detailed Filters */}
      <div id="filters-grid" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div id="label-filter" className="relative col-span-1">
          <Tag id="label-filter-icon" className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <Input
            id="label-input"
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
        <div id="source-filter" className="relative col-span-1">
          <Globe id="source-filter-icon" className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <Input
            id="source-input"
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
        <div id="start-filter" className="relative col-span-1">
          <Calendar id="start-filter-icon" className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <Input
            id="start-input"
            type="datetime-local"
            value={value.start}
            onChange={(e) => updateField("start", e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div id="end-filter" className="relative col-span-1">
          <Calendar id="end-filter-icon" className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <Input
            id="end-input"
            type="datetime-local"
            value={value.end}
            onChange={(e) => updateField("end", e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div id="limit-filter" className="relative col-span-1">
          <ListFilter id="limit-filter-icon" className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <Select
            id="limit-select"
            value={String(value.limit)}
            onChange={(e) => updateField("limit", Number(e.target.value))}
            className="pl-8 h-8 text-xs"
          >
            {[50, 100, 200, 500, 1000].map((n) => (
              <option id={`limit-option-${n}`} key={n} value={n}>
                {n} rows
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
