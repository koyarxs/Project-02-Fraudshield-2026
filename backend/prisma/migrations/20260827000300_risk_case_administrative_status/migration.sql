ALTER TABLE "RiskCase"
ADD COLUMN "administrativeStatus" TEXT,
ADD COLUMN "administrativeReason" TEXT,
ADD COLUMN "administrativeAt" TIMESTAMP(3),
ADD COLUMN "administrativeById" INTEGER;

ALTER TABLE "RiskCase"
ADD CONSTRAINT "RiskCase_administrativeById_fkey"
FOREIGN KEY ("administrativeById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RiskCase_administrativeStatus_idx"
ON "RiskCase"("administrativeStatus");
