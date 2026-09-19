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
