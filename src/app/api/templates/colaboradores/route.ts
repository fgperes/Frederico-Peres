import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { buildTemplateWorkbook } from "@/lib/excel";

export async function GET() {
  await requireUser();

  const headers = [
    "firstName",
    "lastName",
    "email",
    "jobTitle",
    "department",
    "employmentType",
    "weeklyHours",
    "nif",
    "phone",
    "hireDate",
  ];
  const buffer = buildTemplateWorkbook(headers, {
    firstName: "Maria",
    lastName: "Silva",
    email: "maria.silva@empresa.pt",
    jobTitle: "Técnica de Loja",
    department: "Operações",
    employmentType: "FULL_TIME",
    weeklyHours: 40,
    nif: "123456789",
    phone: "912345678",
    hireDate: "2026-01-15",
  });

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_colaboradores.xlsx",
    },
  });
}
