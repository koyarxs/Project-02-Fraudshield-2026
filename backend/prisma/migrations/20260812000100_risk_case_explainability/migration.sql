-- AlterTable
ALTER TABLE "RiskResult" ADD COLUMN "ruleDetails" JSONB;

-- CreateTable
CREATE TABLE "RiskCase" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "reviewResult" TEXT,
    "observations" TEXT,
    "actionTaken" TEXT,
    "responsibleName" TEXT,
    "riskLevelSnapshot" TEXT NOT NULL,
    "scoreSnapshot" INTEGER NOT NULL,
    "classificationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "transactionId" INTEGER NOT NULL,
    "riskResultId" INTEGER,
    "responsibleUserId" INTEGER,

    CONSTRAINT "RiskCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskCase_transactionId_key" ON "RiskCase"("transactionId");

-- AddForeignKey
ALTER TABLE "RiskCase" ADD CONSTRAINT "RiskCase_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskCase" ADD CONSTRAINT "RiskCase_riskResultId_fkey" FOREIGN KEY ("riskResultId") REFERENCES "RiskResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskCase" ADD CONSTRAINT "RiskCase_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
