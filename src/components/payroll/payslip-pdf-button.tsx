"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui";
import { buildPayslipPdfDoc, payslipPdfFileName, type PayslipPdfData } from "@/lib/payslip-pdf";

export type { PayslipPdfData, PayslipPdfLine } from "@/lib/payslip-pdf";

export function PayslipPdfButton({ data }: { data: PayslipPdfData }) {
  async function handleDownload() {
    const doc = await buildPayslipPdfDoc(data);
    doc.save(payslipPdfFileName(data));
  }

  return (
    <Button onClick={handleDownload} variant="secondary">
      <FileDown size={15} />
      Descarregar PDF
    </Button>
  );
}
