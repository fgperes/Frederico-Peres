-- CreateTable
CREATE TABLE "ModuleSubscription" (
    "id" TEXT NOT NULL,
    "predictiveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ModuleSubscription_pkey" PRIMARY KEY ("id")
);
