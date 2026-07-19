-- Converte o perfil (Role) de enum fixo para texto livre, permitindo criar
-- novos tipos de perfil em runtime. Os valores existentes (ex.: 'ADMIN_SISTEMA')
-- são preservados tal e qual, já que correspondem exatamente às etiquetas do enum.
ALTER TABLE "RolePermission" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
ALTER TABLE "UserRole" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;

DROP TYPE "Role";

-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_key_key" ON "RoleDefinition"("key");
