"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";

export type EvaluationPdfQuestionRow = {
  text: string;
  answerLabel: string;
  scoreLabel: string;
};

export type EvaluationPdfData = {
  employeeName: string;
  templateName: string;
  scheduledDateLabel: string;
  respondent: "MANAGER" | "SELF";
  questions: EvaluationPdfQuestionRow[];
  totalPercent: number | null;
  consequence: string | null;
};

export function EvaluationPdfButton({ data }: { data: EvaluationPdfData }) {
  async function handleDownload() {
    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const title = data.respondent === "MANAGER" ? "Avaliação de Desempenho" : "Autoavaliação de Desempenho";

    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("people4people — SGRH", 14, 24);

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(`Colaborador: ${data.employeeName}`, 14, 34);
    doc.text(`Modelo: ${data.templateName}`, 14, 40);
    doc.text(`Data agendada: ${data.scheduledDateLabel}`, 14, 46);

    autoTable(doc, {
      startY: 54,
      head: [["Pergunta", "Resposta", "Pontuação"]],
      body: data.questions.map((q) => [q.text, q.answerLabel, q.scoreLabel]),
      theme: "striped",
      headStyles: { fillColor: [124, 58, 237] },
      columnStyles: { 2: { cellWidth: 28 } },
    });

    const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Resultado final: ${data.totalPercent !== null ? `${data.totalPercent}%` : "—"}`,
      14,
      afterTableY
    );
    doc.setFont("helvetica", "normal");

    if (data.respondent === "MANAGER") {
      doc.setFontSize(10);
      doc.text(`Consequência: ${data.consequence ?? "Sem consequência definida para este resultado."}`, 14, afterTableY + 8, {
        maxWidth: 180,
      });
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(120);
      doc.text(
        "Autoavaliação — só informativa, não conta para o resultado final nem para a consequência.",
        14,
        afterTableY + 8,
        { maxWidth: 180 }
      );
    }

    const fileSuffix = data.respondent === "MANAGER" ? "avaliacao" : "autoavaliacao";
    doc.save(`${fileSuffix}_${data.employeeName.replace(/\s+/g, "_")}.pdf`);
  }

  return (
    <Button onClick={handleDownload} variant="secondary">
      <FileDown size={15} />
      Descarregar PDF
    </Button>
  );
}
