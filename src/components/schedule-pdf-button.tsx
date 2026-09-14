"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export type SchedulePdfRow = {
  employeeName: string;
  employeeNumber?: string | null;
  cells: string[]; // uma célula por dia, ex.: "08:00-16:00" ou "—"
};

// "08:00-16:00" -> "08-16" quando os minutos são sempre :00 — poupa largura
// suficiente para caber os 30/31 dias do mês lado a lado numa só página.
function compactTime(cell: string): string {
  const m = cell.match(/^(\d{2}):00-(\d{2}):00$/);
  return m ? `${m[1]}-${m[2]}` : cell;
}

export function SchedulePdfButton({
  title,
  subtitle,
  weekDayLabels,
  rows,
}: {
  title: string;
  subtitle: string;
  weekDayLabels: string[];
  rows: SchedulePdfRow[];
}) {
  async function handleDownload() {
    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");

    // Muitas colunas (escala mensal, 28-31 dias) precisam de mais largura
    // de página e de um formato de hora mais compacto para caberem todas
    // lado a lado, sem paginação horizontal — cada folha mostra sempre o
    // mês inteiro corrido.
    const dayCount = weekDayLabels.length;
    const compact = dayCount > 14;
    const doc = new jsPDF({ orientation: "landscape", format: compact ? "a3" : "a4" });
    const fontSize = compact ? 7 : 9;
    const nameColumnWidth = compact ? 34 : 44;

    doc.setFontSize(18);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 25);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 32,
      head: [["Colaborador", ...weekDayLabels]],
      body: rows.map((r) => [
        r.employeeNumber ? `${r.employeeName}\nNº ${r.employeeNumber}` : r.employeeName,
        ...(compact ? r.cells.map(compactTime) : r.cells),
      ]),
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237], halign: "center", fontSize },
      styles: { halign: "center", fontSize, cellPadding: compact ? 1 : 2 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: nameColumnWidth } },
      // Evita partir uma linha (nome + dados) ao meio quando calha mesmo na
      // fronteira de página — passa a linha inteira para a página seguinte.
      rowPageBreak: "avoid",
    });

    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Gerado em ${formatDateTime(new Date())} — people4people`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );

    doc.save(`escala_${title.replace(/\s+/g, "_")}.pdf`);
  }

  return (
    <Button onClick={handleDownload} variant="secondary">
      <FileDown size={15} />
      Descarregar PDF (afixar)
    </Button>
  );
}
