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

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function SchedulePdfButton({
  title,
  subtitle,
  weekDayLabels,
  rows,
  clientCompanyName,
  clientCompanyLogo,
}: {
  title: string;
  subtitle: string;
  weekDayLabels: string[];
  rows: SchedulePdfRow[];
  clientCompanyName?: string | null;
  clientCompanyLogo?: string | null;
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho de marca: people4people sempre à esquerda, empresa cliente
    // (configurada em Perfis e Acessos → Documentos) à direita.
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 20, 60);
    doc.text("people4people", 14, 13);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140);
    doc.text("SGRH", 14, 18);

    if (clientCompanyLogo) {
      try {
        const { width, height } = await loadImageSize(clientCompanyLogo);
        const maxW = 42;
        const maxH = 16;
        const scale = Math.min(maxW / width, maxH / height, 1);
        const w = width * scale;
        const h = height * scale;
        doc.addImage(clientCompanyLogo, "JPEG", pageWidth - 14 - w, 6, w, h);
      } catch {
        // Logótipo ilegível (raro) — segue sem ele em vez de falhar o PDF.
      }
    } else if (clientCompanyName) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      doc.text(clientCompanyName, pageWidth - 14, 15, { align: "right" });
    }

    doc.setDrawColor(220);
    doc.line(14, 22, pageWidth - 14, 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(title, 14, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 39);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 46,
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
      "F = Folga · outras siglas de 3 letras = tipo de ausência (ex.: FÉR = Férias)",
      14,
      doc.internal.pageSize.getHeight() - 14
    );
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
