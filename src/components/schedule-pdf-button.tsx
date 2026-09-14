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

    // Cada coluna de dia tem largura fixa, suficiente para mostrar
    // "22:00-06:00" numa só linha, sem quebras. Com muitas colunas (ex.:
    // escala mensal, 28-31 dias) isto não cabe todo numa página — em vez de
    // encolher a letra até ficar ilegível, o autoTable divide as colunas
    // por várias páginas (horizontalPageBreak), repetindo sempre a coluna
    // do colaborador, para que o texto fique sempre com o mesmo tamanho.
    autoTable(doc, {
      startY: 32,
      head: [["Colaborador", ...weekDayLabels]],
      body: rows.map((r) => [r.employeeName, ...r.cells]),
      theme: "grid",
      headStyles: { fillColor: [124, 58, 237], halign: "center", fontSize: 9 },
      styles: { halign: "center", fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 44 } },
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
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
