import type { ResolvedBlock } from "./actions";

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Constrói um único PDF a partir dos blocos já resolvidos (dados vindos do
// servidor) — cada bloco é desenhado na ordem do modelo, com paginação
// automática quando não cabe no que resta da página.
export async function buildAndDownloadDocumentPdf(templateName: string, blocks: ResolvedBlock[]) {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let y = 16;

  function ensureSpace(minHeight: number) {
    if (y + minHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  }

  for (const block of blocks) {
    if (block.type === "HEADER_LOGO") {
      ensureSpace(24);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 20, 60);
      doc.text(block.title, marginX, y + 6);
      if (block.subtitle) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(block.subtitle, marginX, y + 12);
      }
      if (block.clientCompanyLogo) {
        try {
          const { width, height } = await loadImageSize(block.clientCompanyLogo);
          const maxW = 40;
          const maxH = 16;
          const scale = Math.min(maxW / width, maxH / height, 1);
          const w = width * scale;
          const h = height * scale;
          doc.addImage(block.clientCompanyLogo, "JPEG", pageWidth - marginX - w, y - 4, w, h);
        } catch {
          // Logótipo ilegível (raro) — segue sem ele em vez de falhar o PDF.
        }
      } else if (block.clientCompanyName) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60);
        doc.text(block.clientCompanyName, pageWidth - marginX, y + 4, { align: "right" });
      }
      doc.setDrawColor(220);
      doc.line(marginX, y + 16, pageWidth - marginX, y + 16);
      doc.setTextColor(0);
      y += 22;
    } else if (block.type === "TEXT") {
      if (!block.text) continue;
      ensureSpace(10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const lines: string[] = doc.splitTextToSize(block.text, pageWidth - marginX * 2);
      doc.text(lines, marginX, y + 4);
      y += 4 + lines.length * 5 + 4;
    } else if (block.type === "REPORT_TABLE" || block.type === "SCHEDULE_GRID") {
      ensureSpace(14);
      if (block.title) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(block.title, marginX, y + 4);
        y += 8;
      }
      const head = block.type === "REPORT_TABLE" ? [block.columns] : [["Colaborador", ...block.dayLabels]];
      const body =
        block.type === "REPORT_TABLE"
          ? block.rows.map((r) => r.map((cell) => String(cell)))
          : block.rows.map((r) => [
              r.employeeNumber ? `${r.employeeName}\nNº ${r.employeeNumber}` : r.employeeName,
              ...r.cells,
            ]);

      autoTable(doc, {
        startY: y,
        head,
        body,
        theme: "grid",
        headStyles: { fillColor: [124, 58, 237], fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        margin: { left: marginX, right: marginX },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    } else if (block.type === "SIGNATURE") {
      if (block.mode === "SINGLE") {
        ensureSpace(24);
        doc.setDrawColor(0);
        doc.line(marginX, y + 18, marginX + 70, y + 18);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(block.label, marginX, y + 23);
        y += 30;
      } else {
        for (const name of block.employeeNames) {
          ensureSpace(14);
          doc.setFontSize(9);
          doc.setTextColor(0);
          doc.text(name, marginX, y + 4);
          doc.setDrawColor(0);
          doc.line(marginX + 60, y, pageWidth - marginX, y);
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(block.label, marginX + 60, y + 4);
          doc.setTextColor(0);
          y += 12;
        }
        y += 6;
      }
    }
  }

  doc.save(`${templateName.replace(/\s+/g, "_")}.pdf`);
}
