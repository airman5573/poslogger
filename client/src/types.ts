export type LogItem = {
  id: number;
  level: string;
  label: string;
  message: string;
  context: string | null;
  timestamp: string;
  source?: string | null;
  created_at: string;
};

export type LogQuery = {
  levels?: string[];
  labels?: string[];
  sources?: string[];
  start?: string;
  end?: string;
  q?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
};
