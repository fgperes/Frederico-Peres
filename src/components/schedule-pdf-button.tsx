"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";

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

    autoTable(doc, {
      startY: 32,
      head: [["Colaborador", ...weekDayLabels]],
      body: rows.map((r) => [r.employeeName, ...r.cells]),
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237], halign: "center" },
      styles: { halign: "center", fontSize: 9 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    });

    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-PT")} — SGRH`,
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
