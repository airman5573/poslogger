export type LogItem = {
  id: number;
  level: string;
  label: string;
  message: string;
  context: string | null;
  timestamp: string;
  source?: string | null;
  scenario_id: string | null;
  created_at: string;
};

export type LogQuery = {
  levels?: string[];
  labels?: string[];
  sources?: string[];
  start?: string;
  end?: string;
  q?: string;
  scenarioId?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
};

export type AuthStatus = {
  authenticated: boolean;
  expiresAt?: number;
};
