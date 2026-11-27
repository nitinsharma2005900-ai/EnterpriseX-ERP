ALTER TABLE "SystemIncident" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"(id);
ALTER TABLE "IntegrationJob" ADD COLUMN "organizationId" TEXT REFERENCES "Organization"(id);
CREATE INDEX "SystemIncident_organizationId_idx" ON "SystemIncident"("organizationId");
CREATE INDEX "IntegrationJob_organizationId_idx" ON "IntegrationJob"("organizationId");
UPDATE "SystemIncident" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "IntegrationJob" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
