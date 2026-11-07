import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
let active = 0;
const waiting: (() => void)[] = [];
async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (active >= 2) {
    if (waiting.length >= 16) throw new Error("Password service is busy.");
    await new Promise<void>(resolve => waiting.push(resolve));
  } else active++;
  try {
    return await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 32, options,
      (error, key) => error ? reject(error) : resolve(key)));
  } finally { const next = waiting.shift(); if (next) next(); else active--; }
}
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && [...value].length >= 15 && Buffer.byteLength(value, "utf8") <= 256;
}
export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error("Use at least 15 characters and at most 256 UTF-8 bytes.");
  const salt = randomBytes(16);
  return `scrypt-v1:${salt.toString("hex")}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string | null) {
  // A fixed dummy hash gives missing/unverified accounts the same expensive KDF.
  const match = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(stored || "");
  const actual = await derive(password, Buffer.from(match?.[1] || "00".repeat(16), "hex"));
  const expected = Buffer.from(match?.[2] || "00".repeat(32), "hex");
  return timingSafeEqual(actual, expected) && Boolean(match);
}
export const newToken = () => randomBytes(32).toString("hex");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const validToken = (token: unknown): token is string => typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
