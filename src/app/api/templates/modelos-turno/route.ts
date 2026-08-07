import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { buildTemplateWorkbook } from "@/lib/excel";

export async function GET() {
  await requireUser();

  const headers = ["name", "startTime", "endTime", "breakMins", "color"];
  const buffer = buildTemplateWorkbook(headers, {
    name: "Manhã 08h-17h",
    startTime: "08:00",
    endTime: "17:00",
    breakMins: 60,
    color: "#2563eb",
  });

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_modelos_turno.xlsx",
    },
  });
}
