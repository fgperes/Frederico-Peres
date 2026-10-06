import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { buildTemplateWorkbook } from "@/lib/excel";

export async function GET() {
  await requireUser();

  const headers = ["Nº Colaborador", "Email", "Rubrica", "Tipo", "Categoria", "Valor", "Recorrente", "Ano", "Mês"];
  const sampleRow = {
    "Nº Colaborador": "1023",
    Email: "ana.silva@empresa.pt",
    Rubrica: "Prémio de produtividade",
    Tipo: "Vencimento",
    Categoria: "Sujeito a IRS e Segurança Social",
    Valor: 150,
    Recorrente: "Não",
    Ano: new Date().getFullYear(),
    Mês: new Date().getMonth() + 1,
  };
  const buffer = buildTemplateWorkbook(headers, sampleRow);

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_rubricas_payroll.xlsx",
    },
  });
}
