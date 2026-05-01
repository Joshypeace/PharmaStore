-- CreateTable
CREATE TABLE "public"."PharmacySettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pharmacyId" TEXT NOT NULL,

    CONSTRAINT "PharmacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AlertSettings" (
    "id" TEXT NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "expiryAlertDays" INTEGER NOT NULL DEFAULT 30,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "dailyReports" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pharmacyId" TEXT NOT NULL,

    CONSTRAINT "AlertSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SecuritySettings" (
    "id" TEXT NOT NULL,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "passwordPolicy" TEXT NOT NULL DEFAULT 'medium',
    "twoFactorAuth" BOOLEAN NOT NULL DEFAULT false,
    "auditLogging" BOOLEAN NOT NULL DEFAULT true,
    "ipRestrictions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pharmacyId" TEXT NOT NULL,

    CONSTRAINT "SecuritySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BackupSettings" (
    "id" TEXT NOT NULL,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "automaticBackups" BOOLEAN NOT NULL DEFAULT true,
    "lastBackup" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pharmacyId" TEXT NOT NULL,

    CONSTRAINT "BackupSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PharmacySettings" ADD CONSTRAINT "PharmacySettings_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "public"."Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertSettings" ADD CONSTRAINT "AlertSettings_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "public"."Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SecuritySettings" ADD CONSTRAINT "SecuritySettings_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "public"."Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackupSettings" ADD CONSTRAINT "BackupSettings_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "public"."Pharmacy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
