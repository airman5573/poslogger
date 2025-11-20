import { Button } from "./ui/button";
import { Input } from "./ui/input";
import React from "react";

type Props = {
  autoRefresh: boolean;
  intervalMs: number;
  onToggleRefresh: () => void;
  onIntervalChange: (ms: number) => void;
  onRefresh: () => void;
  autoScroll: boolean;
  onToggleScroll: () => void;
};

export function Toolbar({
  autoRefresh,
  intervalMs,
  onToggleRefresh,
  onIntervalChange,
  onRefresh,
  autoScroll,
  onToggleScroll,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant={autoRefresh ? "default" : "outline"} onClick={onToggleRefresh}>
        자동 새로고침 {autoRefresh ? "ON" : "OFF"}
      </Button>
      <Input
        type="number"
        min={500}
        max={30000}
        value={intervalMs}
        onChange={(e) => onIntervalChange(Number(e.target.value))}
        className="w-28"
      />
      <span className="text-xs text-slate-400">ms</span>
      <Button variant="outline" onClick={onRefresh}>
        수동 새로고침
      </Button>
      <Button variant={autoScroll ? "default" : "outline"} onClick={onToggleScroll}>
        자동 스크롤 {autoScroll ? "ON" : "OFF"}
      </Button>
    </div>
  );
}
