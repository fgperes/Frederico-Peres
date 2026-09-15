-- CreateTable
CREATE TABLE "DocumentBrandingSettings" (
    "id" TEXT NOT NULL,
    "clientCompanyName" TEXT,
    "clientCompanyLogo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "DocumentBrandingSettings_pkey" PRIMARY KEY ("id")
);
