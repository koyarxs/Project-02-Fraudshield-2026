-- CreateTable
CREATE TABLE "ControlListEntry" (
    "id" SERIAL NOT NULL,
    "listType" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "ControlListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ControlListEntry_listType_identifierType_identifier_key" ON "ControlListEntry"("listType", "identifierType", "identifier");

-- AddForeignKey
ALTER TABLE "ControlListEntry" ADD CONSTRAINT "ControlListEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
