import { createLogger } from "@/utils/logger";

const uxLog = createLogger("ux.telemetry");

/**
 * Lightweight product analytics via structured logs (no PII; no tokens).
 */
export function uxEvent(event: string, fields?: Readonly<Record<string, unknown>>): void {
  uxLog.info(`ux.${event}`, { ...(fields ?? {}) });
}
