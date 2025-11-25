export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;

export type LogContext = Record<string, unknown> | string | number | boolean | null | Error | unknown;

export type LogPayload = {
  level: LogLevel;
  message: string;
  label?: string;
  context?: LogContext;
  source?: string;
  timestamp?: string;
  endpoint?: string;
};

export type LogOptions = Omit<LogPayload, 'level' | 'message'>;
export type ErrorLogOptions = LogOptions & { error?: unknown };
export type GlobalLoggerFn = (payload: LogPayload) => Promise<unknown> | void;

const DEFAULT_LOG_ENDPOINT = 'https://poslog.store/api/logs';
const DEFAULT_LOG_LABEL = 'pos-fe';
const DEFAULT_SOURCE = 'client';
export const GLOBAL_LOGGER_KEY = 'posLog';
const LEGACY_GLOBAL_LOGGER_KEY = '__POS_LOG__';

const resolveEnvString = (key: string): string | undefined => {
  try {
    const env = (import.meta as { env?: Record<string, unknown> }).env;
    const value = env?.[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  } catch {
    // ignore resolution errors
  }

  return undefined;
};

const resolveEndpoint = (override?: string): string => {
  const fromOverride = typeof override === 'string' ? override.trim() : '';
  if (fromOverride) {
    return fromOverride;
  }

  const envValue = resolveEnvString('VITE_EXTERNAL_LOG_ENDPOINT') ?? resolveEnvString('VITE_LOG_ENDPOINT');
  if (envValue) {
    return envValue;
  }

  return DEFAULT_LOG_ENDPOINT;
};

const resolveLabel = (override?: string): string => {
  const fromOverride = typeof override === 'string' ? override.trim() : '';
  if (fromOverride) {
    return fromOverride;
  }

  const envValue = resolveEnvString('VITE_LOG_LABEL') ?? resolveEnvString('VITE_EXTERNAL_LOG_LABEL');
  if (envValue) {
    return envValue;
  }

  return DEFAULT_LOG_LABEL;
};

const resolveSource = (override?: string) => {
  if (typeof override === 'string' && override.trim()) {
    return override.trim();
  }

  if (typeof window !== 'undefined') {
    const { hostname, pathname } = window.location ?? {};
    if (hostname || pathname) {
      return [hostname, pathname].filter(Boolean).join('') || DEFAULT_SOURCE;
    }
  }

  return DEFAULT_SOURCE;
};

const normalizeErrorValue = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (typeof error === 'number' || typeof error === 'boolean') {
    return { value: error };
  }

  if (typeof error === 'bigint') {
    return { value: error.toString() };
  }

  if (error && typeof error === 'object') {
    return error as Record<string, unknown>;
  }

  return { value: error ?? null };
};

const normalizeContext = (context: LogContext | undefined): Record<string, unknown> | string => {
  if (context === undefined) {
    return {};
  }

  if (context instanceof Error) {
    return normalizeErrorValue(context);
  }

  if (typeof context === 'string') {
    return context;
  }

  if (typeof context === 'number' || typeof context === 'boolean') {
    return { value: context };
  }

  if (typeof context === 'bigint') {
    return { value: context.toString() };
  }

  if (context === null) {
    return { value: null };
  }

  if (context && typeof context === 'object') {
    return context as Record<string, unknown>;
  }

  return { value: String(context) };
};

const attachErrorContext = (context: LogContext | undefined, error: unknown): LogContext => {
  if (error === undefined) {
    return context ?? {};
  }

  const errorContext = normalizeErrorValue(error);

  if (context === undefined) {
    return { error: errorContext };
  }

  if (context instanceof Error || typeof context === 'string') {
    return { context: normalizeContext(context), error: errorContext };
  }

  if (typeof context === 'number' || typeof context === 'boolean' || typeof context === 'bigint' || context === null) {
    return { context, error: errorContext };
  }

  if (context && typeof context === 'object') {
    return { ...(context as Record<string, unknown>), error: errorContext };
  }

  return { context, error: errorContext };
};

export const sendLog = async ({
  level,
  message,
  label,
  context,
  source,
  timestamp,
  endpoint,
}: LogPayload) => {
  const targetEndpoint = resolveEndpoint(endpoint);
  const response = await fetch(targetEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level,
      label: resolveLabel(label),
      message,
      context: normalizeContext(context),
      source: resolveSource(source),
      timestamp,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Log send failed (${response.status}): ${text}`);
  }

  return response.json();
};

export const logInfo = (message: string, options: LogOptions = {}) =>
  sendLog({ level: 'INFO', message, ...options });

export const logWarn = (message: string, options: LogOptions = {}) =>
  sendLog({ level: 'WARN', message, ...options });

export const logDebug = (message: string, options: LogOptions = {}) =>
  sendLog({ level: 'DEBUG', message, ...options });

export const logError = (message: string, options: ErrorLogOptions = {}) => {
  const { error, ...rest } = options;
  const mergedContext = attachErrorContext(rest.context, error);

  return sendLog({
    level: 'ERROR',
    message,
    ...rest,
    context: mergedContext,
  });
};

export const safeLog = (payload: LogPayload) => sendLog(payload).catch(() => undefined);

const defaultGlobalLogger: GlobalLoggerFn = (payload: LogPayload) => safeLog(payload);

export const getPosLog = (key = GLOBAL_LOGGER_KEY): GlobalLoggerFn => {
  if (typeof window === 'undefined') {
    return defaultGlobalLogger;
  }

  const globalObj = window as any as Record<string, unknown>;
  const candidates = [key, LEGACY_GLOBAL_LOGGER_KEY];

  for (const candidate of candidates) {
    const existing = globalObj[candidate];
    if (typeof existing === 'function') {
      return existing as GlobalLoggerFn;
    }
  }

  globalObj[key] = defaultGlobalLogger;
  globalObj[LEGACY_GLOBAL_LOGGER_KEY] = globalObj[key];
  return defaultGlobalLogger;
};

export const attachGlobalLogger = (loggerFn?: GlobalLoggerFn, key = GLOBAL_LOGGER_KEY) => {
  const logger = loggerFn || defaultGlobalLogger;

  if (typeof window !== 'undefined') {
    (window as any as Record<string, unknown>)[key] = logger;
    (window as any as Record<string, unknown>)[LEGACY_GLOBAL_LOGGER_KEY] = logger;
  }

  return logger;
};

const logger = {
  send: sendLog,
  info: logInfo,
  warn: logWarn,
  error: logError,
  debug: logDebug,
  safe: safeLog,
};

export default logger;

declare global {
  interface Window {
    posLog?: GlobalLoggerFn;
    __POS_LOG__?: GlobalLoggerFn;
  }
}
