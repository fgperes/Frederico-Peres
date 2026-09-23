"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";

export type PayslipPdfLine = { label: string; value: number };

export type PayslipPdfData = {
  employeeName: string;
  nif: string | null;
  jobTitle: string;
  year: number;
  month: number;
  documentTitle: string;
  footerNote: string;
  earnings: PayslipPdfLine[];
  deductions: PayslipPdfLine[];
  grossTotal: number;
  netTotal: number;
  employerCost: number;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function PayslipPdfButton({ data }: { data: PayslipPdfData }) {
  async function handleDownload() {
    const { jsPDF } = await import("jspdf");
    const { autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(data.documentTitle, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("people4people — SGRH", 14, 24);

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.text(`Colaborador: ${data.employeeName}`, 14, 34);
    doc.text(`NIF: ${data.nif ?? "—"}`, 14, 40);
    doc.text(`Função: ${data.jobTitle}`, 14, 46);
    doc.text(`Período: ${MONTH_NAMES[data.month - 1]} de ${data.year}`, 14, 52);

    autoTable(doc, {
      startY: 60,
      head: [["Vencimentos", "Valor"]],
      body: data.earnings.map((l) => [l.label, l.value < 0 ? `-${fmt(-l.value)}` : fmt(l.value)]),
      theme: "striped",
      headStyles: { fillColor: [124, 58, 237] },
    });

    const afterEarningsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    autoTable(doc, {
      startY: afterEarningsY,
      head: [["Descontos", "Valor"]],
      body: data.deductions.map((l) => [l.label, l.value < 0 ? `-${fmt(-l.value)}` : fmt(l.value)]),
      theme: "striped",
      headStyles: { fillColor: [225, 29, 72] },
    });

    const afterDeductionsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.text(`Total Bruto: ${fmt(data.grossTotal)}`, 14, afterDeductionsY);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Líquido a Pagar: ${fmt(data.netTotal)}`, 14, afterDeductionsY + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Custo total para a empresa (informativo): ${fmt(data.employerCost)}`, 14, afterDeductionsY + 16);

    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(doc.splitTextToSize(data.footerNote, 180), 14, 285);

    doc.save(`recibo_${data.employeeName.replace(/\s+/g, "_")}_${data.year}_${String(data.month).padStart(2, "0")}.pdf`);
  }

  return (
    <Button onClick={handleDownload} variant="secondary">
      <FileDown size={15} />
      Descarregar PDF
    </Button>
  );
}

function fmt(value: number): string {
  return `${value.toFixed(2)} €`;
}
