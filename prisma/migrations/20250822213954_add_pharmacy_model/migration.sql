-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "pharmacyId" TEXT;

-- CreateTable
CREATE TABLE "public"."Pharmacy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_name_key" ON "public"."Pharmacy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_licenseNumber_key" ON "public"."Pharmacy"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_email_key" ON "public"."Pharmacy"("email");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "public"."Pharmacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
