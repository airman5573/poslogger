export type LogRecord = {
  id: number;
  level: string;
  label: string;
  message: string;
  context: string | null;
  timestamp: string;
  source: string | null;
  scenario_id: string | null;
  created_at: string;
};

export type InsertLog = {
  level: string;
  label: string;
  message: string;
  context?: unknown;
  timestamp?: string;
  source?: string;
  scenarioId?: string;
};

export type ScenarioSummary = {
  scenarioId: string;
  logCount: number;
  firstLogAt: string;
  lastLogAt: string;
  levels: string[];
};
