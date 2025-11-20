import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Button } from "./ui/button";
import React from "react";

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
    <div className="grid gap-3 md:grid-cols-4">
      <div className="md:col-span-2 flex flex-wrap gap-2">
        {LEVELS.map((lvl) => (
          <Button
            key={lvl}
            variant={value.levels.includes(lvl) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLevel(lvl)}
          >
            {lvl}
          </Button>
        ))}
      </div>
      <Input
        value={value.q}
        onChange={(e) => updateField("q", e.target.value)}
        placeholder="메시지/컨텍스트 검색"
      />
      <Select
        value={String(value.limit)}
        onChange={(e) => updateField("limit", Number(e.target.value))}
      >
        {[50, 100, 200, 500, 1000].map((n) => (
          <option key={n} value={n}>
            {n} rows
          </option>
        ))}
      </Select>
      <Input
        placeholder="Label (콤마 구분)"
        value={value.labels.join(",")}
        onChange={(e) =>
          updateField(
            "labels",
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
      />
      <Input
        placeholder="Source (콤마 구분)"
        value={value.sources.join(",")}
        onChange={(e) =>
          updateField(
            "sources",
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
      />
      <Input
        type="datetime-local"
        value={value.start}
        onChange={(e) => updateField("start", e.target.value)}
      />
      <Input
        type="datetime-local"
        value={value.end}
        onChange={(e) => updateField("end", e.target.value)}
      />
      <div className="flex gap-2">
        <Button variant="outline" className="w-full" onClick={onReset}>
          필터 초기화
        </Button>
      </div>
    </div>
  );
}
