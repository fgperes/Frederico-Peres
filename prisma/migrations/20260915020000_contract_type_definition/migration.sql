-- CreateTable
CREATE TABLE "ContractTypeDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractTypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractTypeDefinition_key_key" ON "ContractTypeDefinition"("key");

-- Semeia os 5 tipos originais (mesmos valores usados até agora como
-- constante fixa no código), marcados isSystem para não poderem ser
-- apagados — o código continua a depender do valor "PART_TIME".
INSERT INTO "ContractTypeDefinition" ("id", "key", "label", "isSystem") VALUES
  ('ctd_sem_termo', 'SEM_TERMO', 'Sem termo', true),
  ('ctd_termo_certo', 'TERMO_CERTO', 'Termo certo', true),
  ('ctd_termo_incerto', 'TERMO_INCERTO', 'Termo incerto', true),
  ('ctd_prestacao_servicos', 'PRESTACAO_SERVICOS', 'Prestação de serviços', true),
  ('ctd_part_time', 'PART_TIME', 'Part-time', true)
ON CONFLICT ("key") DO NOTHING;
