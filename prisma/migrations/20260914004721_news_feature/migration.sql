-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canPublishNews" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "notifyUsers" BOOLEAN NOT NULL DEFAULT false,
    "targetRoles" TEXT[],
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
