/**
 * Structured logging — JSON lines in production, readable in dev.
 */

import { platformConfig } from "./config";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, fields?: LogFields) {
  const entry = {
    level,
    message,
    ts: new Date().toISOString(),
    env: platformConfig.nodeEnv,
    ...fields,
  };

  const line = platformConfig.isProd
    ? JSON.stringify(entry)
    : `[${entry.ts}] ${level.toUpperCase()} ${message}${fields ? " " + JSON.stringify(fields) : ""}`;

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
