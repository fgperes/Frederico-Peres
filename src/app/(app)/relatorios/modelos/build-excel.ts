import type { ResolvedBlock } from "./actions";

// Uma folha por bloco de tabela (relatório ou grelha de escala) — blocos
// sem tabela (logótipo, texto, assinatura) não fazem sentido num Excel e
// são ignorados. Mesma biblioteca (xlsx/SheetJS) já usada nas exportações
// de Relatórios (ver src/lib/excel.ts).
export async function buildAndDownloadDocumentExcel(templateName: string, blocks: ResolvedBlock[]) {
  const XLSX = await import("xlsx");

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  function uniqueSheetName(base: string): string {
    const safe = (base || "Folha").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Folha";
    let name = safe;
    let n = 2;
    while (usedNames.has(name)) {
      name = `${safe.slice(0, 28)} ${n}`;
      n++;
    }
    usedNames.add(name);
    return name;
  }

  let hasSheet = false;
  for (const block of blocks) {
    if (block.type === "REPORT_TABLE") {
      const sheet = XLSX.utils.aoa_to_sheet([block.columns, ...block.rows]);
      XLSX.utils.book_append_sheet(workbook, sheet, uniqueSheetName(block.title || "Relatório"));
      hasSheet = true;
    } else if (block.type === "SCHEDULE_GRID") {
      const head = ["Colaborador", "Nº", ...block.dayLabels];
      const rows = block.rows.map((r) => [r.employeeName, r.employeeNumber ?? "", ...r.cells]);
      const sheet = XLSX.utils.aoa_to_sheet([head, ...rows]);
      XLSX.utils.book_append_sheet(workbook, sheet, uniqueSheetName(block.title || "Escala"));
      hasSheet = true;
    }
  }

  if (!hasSheet) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Sem tabelas neste modelo."]]), "Folha1");
  }

  const buffer: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${templateName.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
