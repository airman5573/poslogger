import { Button } from "./ui/button";
import { Input } from "./ui/input";
import React from "react";
import { Play, Pause, RotateCcw, ArrowDownCircle, Clock } from "lucide-react";

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
    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-slate-800">
      <Button
        variant={autoRefresh ? "default" : "ghost"}
        size="sm"
        onClick={onToggleRefresh}
        className={autoRefresh ? "bg-emerald-600 hover:bg-emerald-700" : "text-slate-400 hover:text-slate-200"}
        title="Auto Refresh"
      >
        {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
        {autoRefresh ? "Live" : "Paused"}
      </Button>

      <div className="flex items-center gap-1 px-2 border-l border-slate-800">
         <Clock className="h-3 w-3 text-slate-500" />
         <Input
          type="number"
          min={500}
          max={30000}
          value={intervalMs}
          onChange={(e) => onIntervalChange(Number(e.target.value))}
          className="h-7 w-16 text-xs bg-transparent border-none focus-visible:ring-0 px-0 text-center"
        />
        <span className="text-xs text-slate-500">ms</span>
      </div>

      <div className="h-4 w-px bg-slate-800 mx-1" />

      <Button
        variant={autoScroll ? "secondary" : "ghost"}
        size="icon"
        onClick={onToggleScroll}
        className={autoScroll ? "bg-sky-900/50 text-sky-400" : "text-slate-400 hover:text-slate-200"}
        title="Auto Scroll"
      >
        <ArrowDownCircle className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        title="Refresh Now"
        className="text-slate-400 hover:text-white"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
