import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { buildRowsWorkbook } from "@/lib/excel";

export async function GET() {
  await requireUser();

  const headers = ["date", "description", "scope", "locations"];
  const buffer = buildRowsWorkbook(headers, [], "Template");

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_feriados.xlsx",
    },
  });
}
