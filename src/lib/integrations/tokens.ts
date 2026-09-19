import "server-only";
import { createHash, randomBytes } from "crypto";

export function createIntegrationSecret(): string {
  return `dsa_lt_${randomBytes(32).toString("base64url")}`;
}

export function hashIntegrationSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
