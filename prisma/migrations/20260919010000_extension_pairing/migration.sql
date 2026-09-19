CREATE TABLE "IntegrationPair" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "integrationTokenId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationPair_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntegrationPair_codeHash_key" ON "IntegrationPair"("codeHash");
CREATE UNIQUE INDEX "IntegrationPair_integrationTokenId_key" ON "IntegrationPair"("integrationTokenId");
CREATE INDEX "IntegrationPair_expiresAt_idx" ON "IntegrationPair"("expiresAt");
ALTER TABLE "IntegrationPair" ADD CONSTRAINT "IntegrationPair_integrationTokenId_fkey"
  FOREIGN KEY ("integrationTokenId") REFERENCES "IntegrationToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
