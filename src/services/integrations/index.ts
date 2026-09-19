import "server-only";
import { prisma as defaultDb } from "@/lib/db";
import { createIntegrationSecret, hashIntegrationSecret } from "@/lib/integrations/tokens";

export async function issueLeetCodeCompanionToken(userId: string, db = defaultDb) {
  const secret = createIntegrationSecret();
  const token = await db.integrationToken.create({
    data: { userId, label: "LeetCode companion", tokenHash: hashIntegrationSecret(secret) },
    select: { id: true, label: true, createdAt: true },
  });
  return { ...token, secret };
}

export async function validateIntegrationSecret(secret: string, db = defaultDb): Promise<string | null> {
  if (!secret.startsWith("dsa_lt_") || secret.length < 40) return null;
  const token = await db.integrationToken.findFirst({
    where: { tokenHash: hashIntegrationSecret(secret), revokedAt: null },
    select: { id: true, userId: true },
  });
  if (!token) return null;
  await db.integrationToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  return token.userId;
}

export async function revokeIntegrationToken(userId: string, tokenId: string, db = defaultDb) {
  const token = await db.integrationToken.findFirst({ where: { id: tokenId, userId, revokedAt: null }, select: { id: true } });
  if (!token) return false;
  await db.integrationToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
  return true;
}

export async function pairLeetCodeCompanion(userId: string, pairingCode: string, secret: string, db = defaultDb) {
  if (!pairingCode.startsWith("pair_") || pairingCode.length < 40) throw new Error("Invalid pairing code");
  if (!secret.startsWith("dsa_lt_") || secret.length < 40) throw new Error("Invalid companion token");
  const token = await db.integrationToken.create({
    data: { userId, label: "LeetCode companion", tokenHash: hashIntegrationSecret(secret) },
    select: { id: true },
  });
  try {
    await db.integrationPair.create({
      data: { codeHash: hashIntegrationSecret(pairingCode), integrationTokenId: token.id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
  } catch (error) {
    await db.integrationToken.delete({ where: { id: token.id } });
    throw error;
  }
}

export async function isPairingComplete(pairingCode: string, db = defaultDb) {
  if (!pairingCode.startsWith("pair_") || pairingCode.length < 40) return false;
  const pair = await db.integrationPair.findFirst({
    where: { codeHash: hashIntegrationSecret(pairingCode), expiresAt: { gt: new Date() } }, select: { id: true },
  });
  return Boolean(pair);
}
