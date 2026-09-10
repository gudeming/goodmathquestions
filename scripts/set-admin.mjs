#!/usr/bin/env node
/**
 * Grant or revoke admin access, and create the initial admin account.
 *
 * Usage (run from the repo root, with .env loaded):
 *   node scripts/set-admin.mjs grant <username>
 *   node scripts/set-admin.mjs revoke <username>
 *   node scripts/set-admin.mjs list
 *   node scripts/set-admin.mjs create <username> [email]
 *
 * `create` generates a random password and prints it once — it is never stored
 * in plaintext, so capture it before the terminal scrolls away.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_ROUNDS = 12;
const PASSWORD_LENGTH = 24;
// Omits look-alike characters (0/O, 1/l/I) so passwords survive being read aloud.
const PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

const db = new PrismaClient();

function generatePassword() {
  return Array.from(crypto.randomBytes(PASSWORD_LENGTH))
    .map((byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length])
    .join("");
}

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    [
      "Usage:",
      "  node scripts/set-admin.mjs grant  <username>",
      "  node scripts/set-admin.mjs revoke <username>",
      "  node scripts/set-admin.mjs list",
      "  node scripts/set-admin.mjs create <username> [email]",
    ].join("\n")
  );
  process.exit(1);
}

async function setAdminFlag(username, isAdmin) {
  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!existing) usage(`no user with username "${username}"`);

  const user = await db.user.update({
    where: { username },
    data: { isAdmin },
    select: { username: true, email: true, isAdmin: true },
  });
  console.log(`${isAdmin ? "Granted" : "Revoked"} admin: ${user.username} (${user.email ?? "no email"})`);
}

async function listAdmins() {
  const admins = await db.user.findMany({
    where: { isAdmin: true },
    select: { username: true, email: true, displayName: true },
    orderBy: { username: "asc" },
  });
  if (admins.length === 0) {
    console.log("No admin users. Grant one with: node scripts/set-admin.mjs grant <username>");
    return;
  }
  console.log(`${admins.length} admin user(s):`);
  for (const a of admins) {
    console.log(`  ${a.username}\t${a.email ?? "-"}\t${a.displayName}`);
  }
}

async function createAdmin(username, email) {
  const password = generatePassword();
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await db.user.upsert({
    where: { username },
    update: { password: hashed, isAdmin: true, ...(email ? { email } : {}) },
    create: {
      username,
      email: email ?? null,
      displayName: username,
      password: hashed,
      age: 18,
      locale: "en",
      isAdmin: true,
    },
    select: { username: true, email: true },
  });

  console.log(`Admin ready: ${user.username} (${user.email ?? "no email"})`);
  console.log(`Password: ${password}`);
  console.log("Store this now — it is not recoverable.");
}

const [command, arg1, arg2] = process.argv.slice(2);

try {
  switch (command) {
    case "grant":
      if (!arg1) usage("grant requires a username");
      await setAdminFlag(arg1, true);
      break;
    case "revoke":
      if (!arg1) usage("revoke requires a username");
      await setAdminFlag(arg1, false);
      break;
    case "list":
      await listAdmins();
      break;
    case "create":
      if (!arg1) usage("create requires a username");
      await createAdmin(arg1, arg2);
      break;
    default:
      usage(command ? `unknown command "${command}"` : null);
  }
} finally {
  await db.$disconnect();
}
