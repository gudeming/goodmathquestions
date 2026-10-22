import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load the repo-root .env (DATABASE_URL, REDIS_URL, ...) without overriding anything
// already set, so NODE_ENV stays "test" and CI can inject its own values.
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trimStart().startsWith("#")) continue;
    const [, key, rawValue] = m;
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
