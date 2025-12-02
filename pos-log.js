/**
 * @typedef {'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string} LogLevel
 * @typedef {Object.<string, any> | string | number | boolean | null | Error | unknown} LogContext
 * @typedef {Object} LogPayload
 * @property {LogLevel} level
 * @property {string} message
 * @property {string} [label]
 * @property {LogContext} [context]
 * @property {string} [source]
 * @property {string} [timestamp]
 * @property {string} [endpoint]
 * @property {string} [scenarioId]
 *
 * @typedef {Object} LogOptions
 * @property {string} [label]
 * @property {LogContext} [context]
 * @property {string} [source]
 * @property {string} [timestamp]
 * @property {string} [endpoint]
 * @property {string} [scenarioId]
 *
 * @typedef {LogOptions & { error?: unknown }} ErrorLogOptions
 * @typedef {(payload: LogPayload) => Promise<unknown> | void} GlobalLoggerFn
 */

const DEFAULT_LOG_ENDPOINT = 'https://poslog.store/api/logs';
const DEFAULT_LOG_LABEL = 'pos-fe';
const DEFAULT_SOURCE = 'client';
export const GLOBAL_LOGGER_KEY = 'posLog';
const LEGACY_GLOBAL_LOGGER_KEY = '__POS_LOG__';

/**
 * @param {string} key
 * @returns {string | undefined}
 */
const resolveEnvString = (key) => {
  try {
    const env = (import.meta ?? {}).env;
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

/**
 * @param {string | undefined} override
 * @returns {string}
 */
const resolveEndpoint = (override) => {
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

/**
 * @param {string | undefined} override
 * @returns {string}
 */
const resolveLabel = (override) => {
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

/**
 * @param {string | undefined} override
 * @returns {string}
 */
const resolveSource = (override) => {
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

/**
 * @param {unknown} error
 * @returns {Object.<string, any>}
 */
const normalizeErrorValue = (error) => {
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
    return error;
  }

  return { value: error ?? null };
};

/**
 * @param {LogContext | undefined} context
 * @returns {Object.<string, any> | string}
 */
const normalizeContext = (context) => {
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
    return context;
  }

  return { value: String(context) };
};

/**
 * @param {LogContext | undefined} context
 * @param {unknown} error
 * @returns {LogContext}
 */
const attachErrorContext = (context, error) => {
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
    return { ...context, error: errorContext };
  }

  return { context, error: errorContext };
};

/**
 * @param {LogPayload} param0
 */
export const sendLog = async ({
  level,
  message,
  label,
  context,
  source,
  timestamp,
  endpoint,
  scenarioId,
}) => {
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
      scenarioId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Log send failed (${response.status}): ${text}`);
  }

  return response.json();
};

/**
 * @param {string} message
 * @param {LogOptions} [options]
 */
export const logInfo = (message, options = {}) => sendLog({ level: 'INFO', message, ...options });

/**
 * @param {string} message
 * @param {LogOptions} [options]
 */
export const logWarn = (message, options = {}) => sendLog({ level: 'WARN', message, ...options });

/**
 * @param {string} message
 * @param {LogOptions} [options]
 */
export const logDebug = (message, options = {}) => sendLog({ level: 'DEBUG', message, ...options });

/**
 * @param {string} message
 * @param {ErrorLogOptions} [options]
 */
export const logError = (message, options = {}) => {
  const { error, ...rest } = options;
  const mergedContext = attachErrorContext(rest.context, error);

  return sendLog({
    level: 'ERROR',
    message,
    ...rest,
    context: mergedContext,
  });
};

/**
 * @param {LogPayload} payload
 */
export const safeLog = (payload) => sendLog(payload).catch(() => undefined);

/** @type {GlobalLoggerFn} */
const defaultGlobalLogger = (payload) => safeLog(payload);

/**
 * @param {string} [key]
 * @returns {GlobalLoggerFn}
 */
export const getPosLog = (key = GLOBAL_LOGGER_KEY) => {
  if (typeof window === 'undefined') {
    return defaultGlobalLogger;
  }

  const globalObj = window;
  const candidates = [key, LEGACY_GLOBAL_LOGGER_KEY];

  for (const candidate of candidates) {
    const existing = globalObj[candidate];
    if (typeof existing === 'function') {
      return existing;
    }
  }

  globalObj[key] = defaultGlobalLogger;
  globalObj[LEGACY_GLOBAL_LOGGER_KEY] = globalObj[key];
  return defaultGlobalLogger;
};

/**
 * @param {GlobalLoggerFn} [loggerFn]
 * @param {string} [key]
 * @returns {GlobalLoggerFn}
 */
export const attachGlobalLogger = (loggerFn, key = GLOBAL_LOGGER_KEY) => {
  const logger = loggerFn || defaultGlobalLogger;

  if (typeof window !== 'undefined') {
    window[key] = logger;
    window[LEGACY_GLOBAL_LOGGER_KEY] = logger;
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
