-- AlterTable
ALTER TABLE "RiskCase" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "RiskCase" ADD COLUMN "internalComments" TEXT;

-- CreateTable
CREATE TABLE "RiskCaseTimeline" (
    "id" SERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskCaseId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "RiskCaseTimeline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RiskCaseTimeline" ADD CONSTRAINT "RiskCaseTimeline_riskCaseId_fkey" FOREIGN KEY ("riskCaseId") REFERENCES "RiskCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskCaseTimeline" ADD CONSTRAINT "RiskCaseTimeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
