"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export type SchedulePdfRow = {
  employeeName: string;
  cells: string[]; // uma célula por dia, ex.: "08:00-16:00" ou "—"
};

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

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(18);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 25);
    doc.setTextColor(0);

    // Muitas colunas (ex.: escala mensal, 28-31 dias) precisam de letra mais
    // pequena e de uma largura fixa para a coluna do nome — sem isto, o
    // autoTable reparte a largura da página por igual e cada célula fica
    // estreita a ponto de quebrar palavra a palavra, letra a letra.
    const dayCount = weekDayLabels.length;
    const fontSize = dayCount > 20 ? 6 : dayCount > 12 ? 7 : 9;
    const nameColumnWidth = dayCount > 20 ? 32 : 40;

    autoTable(doc, {
      startY: 32,
      head: [["Colaborador", ...weekDayLabels]],
      body: rows.map((r) => [r.employeeName, ...r.cells]),
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237], halign: "center", fontSize },
      styles: { halign: "center", fontSize, cellPadding: dayCount > 20 ? 1 : 2 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: nameColumnWidth } },
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
