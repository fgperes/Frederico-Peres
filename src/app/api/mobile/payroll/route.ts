import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);
    if (!user.employeeId) {
      return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: {
        baseSalary: true,
        employeeContracts: { where: { status: "ACTIVE" }, take: 1, include: { contractProfile: true } },
        payslips: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 12,
          select: { year: true, month: true, grossTotal: true, netTotal: true, employerCost: true, generatedAt: true },
        },
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Colaborador não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      baseSalary: employee.baseSalary,
      weeklyHours: employee.employeeContracts[0]?.contractProfile.weeklyHours ?? null,
      payslips: employee.payslips,
    });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
