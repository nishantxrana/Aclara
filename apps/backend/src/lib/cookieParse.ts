/**
 * Reads a single cookie value from the Cookie header (no external dependency).
 */
export function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (cookieHeader === undefined || cookieHeader.length === 0) {
    return undefined;
  }
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const prefix = `${name}=`;
    if (trimmed.startsWith(prefix)) {
      const raw = trimmed.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}
