// Construção do PDF do recibo de vencimento — isomórfico (corre tanto no
// browser, para o botão "Descarregar PDF", como no servidor, para o envio
// por email), por isso usa sempre import() dinâmico do jsPDF em vez de o
// deixar no bundle do cliente à partida.

export type PayslipPdfLine = { label: string; value: number };

export type PayslipPdfData = {
  companyName: string | null;
  companyLogo: string | null;
  companyNif: string | null;
  companyAddress: string | null;
  companySocialSecurityNo: string | null;
  employeeName: string;
  employeeNumber: string | null;
  nif: string | null;
  socialSecurityNo: string | null;
  address: string | null;
  iban: string | null;
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
  ytdGross: number;
  ytdIrs: number;
  ytdSocialSecurity: number;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MARGIN = 14;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function fmt(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)} €`;
}

export function payslipPdfFileName(data: PayslipPdfData): string {
  return `recibo_${data.employeeName.replace(/\s+/g, "_")}_${data.year}_${String(data.month).padStart(2, "0")}.pdf`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tipo do jsPDF só é conhecido depois do import() dinâmico
export async function buildPayslipPdfDoc(data: PayslipPdfData): Promise<any> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const periodCode = `${data.year}${String(data.month).padStart(2, "0")}`;
  const receiptNumber = `${periodCode}-${data.employeeNumber ?? "S/N"}`;

  // --- Cabeçalho: logótipo + nome e dados fiscais da empresa ---
  let logoBottomY = MARGIN;
  if (data.companyLogo) {
    try {
      const dims = doc.getImageProperties(data.companyLogo);
      const logoWidth = 28;
      const logoHeight = (dims.height / dims.width) * logoWidth;
      doc.addImage(data.companyLogo, MARGIN, MARGIN, logoWidth, logoHeight);
      logoBottomY = MARGIN + logoHeight;
    } catch {
      // logótipo inválido/não suportado pelo jsPDF — segue sem imagem
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text(data.companyName ?? "Empresa não configurada", PAGE_WIDTH / 2, MARGIN + 4, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  let companyInfoY = MARGIN + 2;
  const companyInfoX = data.companyLogo ? MARGIN + 32 : MARGIN;
  if (data.companyAddress) {
    for (const line of data.companyAddress.split("\n")) {
      companyInfoY += 4;
      doc.text(line, companyInfoX, companyInfoY);
    }
  }
  if (data.companyNif) {
    companyInfoY += 4;
    doc.text(`Contribuinte: ${data.companyNif}`, companyInfoX, companyInfoY);
  }

  const headerBottomY = Math.max(logoBottomY, companyInfoY) + 6;

  // --- Caixa esquerda: identificação do recibo ---
  const boxTop = headerBottomY;
  const boxHeight = 38;
  const leftBoxWidth = CONTENT_WIDTH * 0.46;
  const rightBoxX = MARGIN + leftBoxWidth + 4;
  const rightBoxWidth = CONTENT_WIDTH - leftBoxWidth - 4;

  doc.setDrawColor(180);
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, boxTop, leftBoxWidth, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(data.documentTitle.toUpperCase(), MARGIN + leftBoxWidth / 2, boxTop + 5, { align: "center" });

  doc.rect(MARGIN, boxTop + 7, leftBoxWidth, boxHeight - 7);
  const receiptRows: [string, string][] = [
    ["RECIBO Nº", receiptNumber],
    ["VENCIMENTO DE", `${MONTH_NAMES[data.month - 1]} de ${data.year}`],
    ["Nº COLABORADOR", data.employeeNumber ?? "—"],
    ["Nº BENEFICIÁRIO (SS)", data.socialSecurityNo ?? "—"],
    ["Nº CONTRIBUINTE", data.nif ?? "—"],
  ];
  doc.setFontSize(8);
  let rowY = boxTop + 12;
  for (const [label, value] of receiptRows) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(label, MARGIN + 2, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(value, MARGIN + leftBoxWidth - 2, rowY, { align: "right" });
    rowY += 5.5;
  }

  // --- Caixa direita: identificação do colaborador ---
  doc.rect(rightBoxX, boxTop, rightBoxWidth, boxHeight);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text(data.employeeName.toUpperCase(), rightBoxX + rightBoxWidth / 2, boxTop + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80);
  let addrY = boxTop + 16;
  const addressLines = data.address ? data.address.split("\n") : ["—"];
  for (const line of addressLines) {
    doc.text(line, rightBoxX + rightBoxWidth / 2, addrY, { align: "center" });
    addrY += 4.5;
  }
  if (data.iban) {
    doc.setFontSize(7.5);
    doc.setTextColor(110);
    doc.text(`IBAN: ${data.iban}`, rightBoxX + rightBoxWidth / 2, boxTop + boxHeight - 4, { align: "center" });
  }

  // --- Categoria / função ---
  const categoryY = boxTop + boxHeight + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20);
  doc.text(`CATEGORIA: ${data.jobTitle}`, MARGIN, categoryY);

  // --- Tabela de rubricas (Período/Descrição/Abono/Desconto) ---
  const rows: string[][] = [];
  for (const line of data.earnings) {
    rows.push([periodCode, line.label, fmt(line.value), ""]);
  }
  for (const line of data.deductions) {
    rows.push([periodCode, line.label, "", fmt(line.value)]);
  }

  autoTable(doc, {
    startY: categoryY + 4,
    head: [["Período", "Descrição", "Abono", "Desconto"]],
    body: rows,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1.5 },
    headStyles: { fillColor: [245, 245, 245], textColor: 40, fontStyle: "bold", lineWidth: 0.1, lineColor: 180 },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && (hookData.column.index === 2 || hookData.column.index === 3)) {
        hookData.cell.styles.textColor = hookData.column.index === 3 ? [190, 30, 30] : [20, 20, 20];
      }
    },
  });

  const afterTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

  doc.setDrawColor(180);
  doc.line(MARGIN, afterTableY, PAGE_WIDTH - MARGIN, afterTableY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.text("TOTAL", MARGIN + CONTENT_WIDTH - 60, afterTableY + 6);
  doc.text(fmt(data.grossTotal), MARGIN + CONTENT_WIDTH - 30, afterTableY + 6, { align: "right" });
  doc.setTextColor(190, 30, 30);
  doc.text(fmt(-(data.grossTotal - data.netTotal)), MARGIN + CONTENT_WIDTH, afterTableY + 6, { align: "right" });

  // --- Totais acumulados do ano + líquido deste recibo ---
  const ytdBoxY = afterTableY + 12;
  const ytdBoxHeight = 16;
  const liquidBoxWidth = 42;
  const accruedBoxWidth = CONTENT_WIDTH - liquidBoxWidth - 2;

  doc.setDrawColor(180);
  doc.rect(MARGIN, ytdBoxY, accruedBoxWidth, ytdBoxHeight);
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, ytdBoxY, accruedBoxWidth, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(20);
  doc.text("TOTAIS ACUMULADOS DO ANO", MARGIN + accruedBoxWidth / 2, ytdBoxY + 4, { align: "center" });

  const colW = accruedBoxWidth / 3;
  const accruedLabels: [string, string][] = [
    ["Remunerações", fmt(data.ytdGross)],
    ["I.R.S.", fmt(-data.ytdIrs)],
    ["T.S.U.", fmt(-data.ytdSocialSecurity)],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  accruedLabels.forEach(([label, value], i) => {
    const x = MARGIN + colW * i + colW / 2;
    doc.setTextColor(100);
    doc.text(label, x, ytdBoxY + 10, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(value, x, ytdBoxY + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
  });

  const liquidBoxX = MARGIN + accruedBoxWidth + 2;
  doc.rect(liquidBoxX, ytdBoxY, liquidBoxWidth, ytdBoxHeight);
  doc.setFillColor(240, 240, 240);
  doc.rect(liquidBoxX, ytdBoxY, liquidBoxWidth, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(20);
  doc.text("TOTAL LÍQUIDO", liquidBoxX + liquidBoxWidth / 2, ytdBoxY + 4, { align: "center" });
  doc.setFontSize(10);
  doc.text(fmt(data.netTotal), liquidBoxX + liquidBoxWidth / 2, ytdBoxY + 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130);
  doc.text(`Custo total para a empresa (informativo): ${fmt(data.employerCost)}`, MARGIN, ytdBoxY + ytdBoxHeight + 6);

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(doc.splitTextToSize(data.footerNote, CONTENT_WIDTH), MARGIN, 285);

  return doc;
}
