/**
 * Anonymous visitor id. The web client generates a UUID v4 once, keeps it in
 * localStorage ("gmq_anon") and sends it on every tRPC request in this header.
 * It is an identity hint for guests, never an authentication credential: a
 * signed-in session always takes precedence.
 */
export const ANON_ID_HEADER = "x-gmq-anon";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns the lower-cased id when `raw` is a strict UUID v4, otherwise null. */
export function parseAnonId(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return UUID_V4.test(value) ? value.toLowerCase() : null;
}
