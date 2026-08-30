CREATE TYPE "UserRole" AS ENUM ('ADMINISTRADOR', 'ANALISTA');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ANALISTA',
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "User"
SET "active" = false;

UPDATE "User"
SET "role" = 'ADMINISTRADOR', "active" = true
WHERE LOWER("email") = 'admin@fraudshield.cl';

UPDATE "User"
SET "role" = 'ANALISTA', "active" = true
WHERE LOWER("email") = 'yerko@fraudshield.cl';
