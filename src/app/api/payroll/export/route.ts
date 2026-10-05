import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { getPayslipLayoutSettings, buildPayslipLines } from "@/lib/payroll";
import { buildRowsWorkbook } from "@/lib/excel";

// Exportação Excel de um período de payroll: uma linha por colaborador com
// recibo gerado, uma coluna por rubrica configurada no layout do recibo
// (mesmas chaves/ordem que o PDF), e uma linha final de totais/subtotais.
export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!canWrite(user.roles, "payroll")) {
    return NextResponse.json({ error: "Sem permissão para exportar payroll." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  const scope = await employeeScopeWhere(user);
  const [payslips, layout] = await Promise.all([
    prisma.payslip.findMany({
      where: { year, month, employee: scope },
      include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      orderBy: [{ employee: { firstName: "asc" } }],
    }),
    getPayslipLayoutSettings(),
  ]);

  const columns = [
    "Colaborador",
    "Nº Colaborador",
    ...layout.lineItems.filter((i) => i.visible).map((i) => i.label),
    "Total Bruto",
    "Total Líquido",
    "Custo Empresa",
  ];

  const rows: (string | number)[][] = payslips.map((p) => {
    const lines = buildPayslipLines(p, layout.lineItems, true);
    const byKey = new Map(lines.map((l) => [l.key, l.value]));
    return [
      `${p.employee.firstName} ${p.employee.lastName}`,
      p.employee.employeeNumber ?? "",
      ...layout.lineItems.filter((i) => i.visible).map((i) => Number((byKey.get(i.key) ?? 0).toFixed(2))),
      Number(p.grossTotal.toFixed(2)),
      Number(p.netTotal.toFixed(2)),
      Number(p.employerCost.toFixed(2)),
    ];
  });

  if (rows.length > 0) {
    const numericColStart = 2;
    const totals: (string | number)[] = columns.map((_, colIndex) => {
      if (colIndex < numericColStart) return colIndex === 0 ? "TOTAL" : "";
      const sum = rows.reduce((acc, row) => acc + Number(row[colIndex] ?? 0), 0);
      return Number(sum.toFixed(2));
    });
    rows.push(totals);
  }

  const buffer = buildRowsWorkbook(columns, rows, `Payroll ${month}-${year}`);

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=payroll_${year}_${String(month).padStart(2, "0")}.xlsx`,
    },
  });
}
