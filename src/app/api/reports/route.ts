import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canRead } from "@/lib/roles";
import { employeeScopeWhere } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { generateReport } from "@/lib/reports";
import { buildRowsWorkbook } from "@/lib/excel";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!canRead(user.roles, "relatorios")) {
    return NextResponse.json({ error: "Sem permissão para exportar relatórios." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const reportKey = searchParams.get("report") ?? "acessos";
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const employeesParam = searchParams.get("employees");

  const scope = await employeeScopeWhere(user);
  const isBroadScope = Object.keys(scope).length === 0;
  const scopedEmployees = await prisma.employee.findMany({ where: scope, select: { id: true } });
  const scopedIds = new Set(scopedEmployees.map((e) => e.id));

  let employeeIds: string[] | undefined;
  if (employeesParam) {
    const requested = employeesParam.split(",").filter(Boolean);
    employeeIds = isBroadScope ? requested : requested.filter((id) => scopedIds.has(id));
  } else if (!isBroadScope) {
    employeeIds = Array.from(scopedIds);
  }

  const now = new Date();
  const from = fromStr ? new Date(`${fromStr}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toStr ? new Date(`${toStr}T23:59:59`) : now;

  const result = await generateReport(reportKey, { from, to, employeeIds });
  const buffer = buildRowsWorkbook(result.columns, result.rows, reportKey);

  return new NextResponse(new Blob([buffer]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=relatorio_${reportKey}.xlsx`,
    },
  });
}
