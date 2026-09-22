import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { buildTemplateWorkbook } from "@/lib/excel";

export async function GET() {
  await requireUser();

  const headers = ["date", "description", "scope", "locations"];
  const buffer = buildTemplateWorkbook(headers, {
    date: "2026-06-13",
    description: "Dia Municipal",
    scope: "REGIONAL",
    locations: "Sede — Lisboa",
  });

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_feriados.xlsx",
    },
  });
}
