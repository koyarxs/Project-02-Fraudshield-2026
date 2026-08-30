DROP INDEX IF EXISTS "RiskCase_administrativeStatus_idx";

ALTER TABLE "RiskCase"
DROP CONSTRAINT IF EXISTS "RiskCase_administrativeById_fkey";

ALTER TABLE "RiskCase"
DROP COLUMN IF EXISTS "administrativeStatus",
DROP COLUMN IF EXISTS "administrativeReason",
DROP COLUMN IF EXISTS "administrativeAt",
DROP COLUMN IF EXISTS "administrativeById";
