export type LogLevelName = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_RANK: Record<LogLevelName, number> = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
};

export type LogFields = Readonly<Record<string, unknown>>;

const SENSITIVE_KEY = /^(authorization|pat|password|secret|cookie)$/i;

function sanitizeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    if (typeof v === "string" && v.length > 200) {
      out[k] = `${v.slice(0, 80)}…(${String(v.length)} chars)`;
      continue;
    }
    out[k] = v;
  }
  return out;
}

function configuredMinLevel(): LogLevelName {
  const raw = import.meta.env.VITE_LOG_LEVEL?.trim().toUpperCase();
  if (
    raw === "TRACE" ||
    raw === "DEBUG" ||
    raw === "INFO" ||
    raw === "WARN" ||
    raw === "ERROR"
  ) {
    return raw;
  }
  if (import.meta.env.DEV) {
    return "DEBUG";
  }
  return "INFO";
}

function shouldLog(level: LogLevelName): boolean {
  const min = LEVEL_RANK[configuredMinLevel()];
  return LEVEL_RANK[level] >= min;
}

function formatLine(level: LogLevelName, msg: string, bindings: LogFields): string {
  const ts = new Date().toISOString();
  const extra =
    Object.keys(bindings).length > 0
      ? ` ${JSON.stringify(sanitizeFields({ ...bindings }))}`
      : "";
  return `${ts} [${level}] ${msg}${extra}`;
}

function writeLine(level: LogLevelName, msg: string, bindings: LogFields): void {
  if (!shouldLog(level)) {
    return;
  }
  const out = formatLine(level, msg, bindings);
  if (level === "ERROR") {
    console.error(out);
  } else if (level === "WARN") {
    console.warn(out);
  } else {
    console.log(out);
  }
}

function mergeBindings(base: LogFields, more?: LogFields): LogFields {
  if (more === undefined || Object.keys(more).length === 0) {
    return base;
  }
  return { ...base, ...more };
}

export interface Logger {
  trace(msg: string, fields?: LogFields): void;
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(extra: LogFields): Logger;
}

function createLoggerImpl(bindings: LogFields): Logger {
  return {
    trace(msg, fields) {
      writeLine("TRACE", msg, mergeBindings(bindings, fields));
    },
    debug(msg, fields) {
      writeLine("DEBUG", msg, mergeBindings(bindings, fields));
    },
    info(msg, fields) {
      writeLine("INFO", msg, mergeBindings(bindings, fields));
    },
    warn(msg, fields) {
      writeLine("WARN", msg, mergeBindings(bindings, fields));
    },
    error(msg, fields) {
      writeLine("ERROR", msg, mergeBindings(bindings, fields));
    },
    child(extra) {
      return createLoggerImpl(mergeBindings(bindings, extra));
    },
  };
}

/**
 * Browser logger. Set `VITE_LOG_LEVEL` (TRACE–ERROR); defaults to DEBUG in dev and INFO in prod builds.
 */
export function createLogger(component: string): Logger {
  return createLoggerImpl({ component });
}
