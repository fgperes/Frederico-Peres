import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import * as XLSX from "xlsx";
import { DISTRICTS_MUNICIPALITIES } from "@/lib/pt-geo";

export async function GET() {
  await requireUser();

  const headers = ["date", "description", "scope", "municipalities"];
  const templateRows: (string | number)[][] = [
    headers,
    ["2026-06-13", "Dia de Santo António", "REGIONAL", "Lisboa"],
    ["2026-12-25", "Natal", "NATIONAL", ""],
  ];
  const templateSheet = XLSX.utils.aoa_to_sheet(templateRows);

  // Folha de referência com todos os concelhos válidos — a coluna
  // municipalities do template aceita vários, separados por vírgula.
  const referenceRows: (string | number)[][] = [["district", "municipality"]];
  for (const [district, municipalities] of Object.entries(DISTRICTS_MUNICIPALITIES)) {
    for (const municipality of municipalities) referenceRows.push([district, municipality]);
  }
  const referenceSheet = XLSX.utils.aoa_to_sheet(referenceRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template");
  XLSX.utils.book_append_sheet(workbook, referenceSheet, "Concelhos");
  const buffer: Buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);

  return new NextResponse(new Blob([arrayBuffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template_feriados.xlsx",
    },
  });
}
