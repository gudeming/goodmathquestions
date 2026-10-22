/**
 * Anonymous visitor id for guests (guesses, events). Generated once per browser,
 * persisted in localStorage and sent on every tRPC request as `x-gmq-anon`.
 * The server (packages/api/src/anon-id.ts) accepts it only if it is a UUID v4,
 * and a signed-in session always takes precedence over it.
 *
 * The constants and regex are duplicated from @gmq/api on purpose: importing that
 * package here would pull server code (Prisma, Redis) into the client bundle.
 */
export const ANON_ID_HEADER = "x-gmq-anon";
export const ANON_ID_STORAGE_KEY = "gmq_anon";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let cached: string | null = null;

function randomUuidV4(): string {
  // crypto.randomUUID needs a secure context; fall back to getRandomValues on plain http.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Returns this browser's anonymous id, creating it on first use. Null during SSR. */
export function getAnonId(): string | null {
  if (typeof window === "undefined") return null;
  if (cached) return cached;

  try {
    const stored = window.localStorage.getItem(ANON_ID_STORAGE_KEY);
    if (stored && UUID_V4.test(stored)) {
      cached = stored;
      return cached;
    }
  } catch {
    // Storage blocked (private mode, disabled cookies): fall through to an in-memory id.
  }

  cached = randomUuidV4();
  try {
    window.localStorage.setItem(ANON_ID_STORAGE_KEY, cached);
  } catch {
    // Not persisted; the id still lives for this page session.
  }
  return cached;
}

/** Headers to attach to tRPC requests. Empty on the server. */
export function anonIdHeaders(): Record<string, string> {
  const id = getAnonId();
  return id ? { [ANON_ID_HEADER]: id } : {};
}
