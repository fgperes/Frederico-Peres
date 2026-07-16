import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { buildTemplateWorkbook } from "@/lib/excel";

export async function GET() {
  await requireUser();

  const headers = ["date", "hour", "department", "location", "demandValue"];
  const buffer = buildTemplateWorkbook(headers, {
    date: "2026-07-20",
    hour: 10,
    department: "Operações",
    location: "Sede — Lisboa",
    demandValue: 42,
  });

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_procura.xlsx",
    },
  });
}
