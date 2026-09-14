import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordTimeClockEntry, type PunchType } from "@/lib/timeclock";
import { logAudit } from "@/lib/audit";

const VALID_TYPES: PunchType[] = ["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"];

// Endpoint de integração para terminais físicos de picagem (biométrico,
// RFID, PIN, etc.). Cada equipamento tem um token único (Equipment.webhookToken)
// que identifica de onde vem a picagem — não há autenticação de utilizador
// aqui porque quem chama é o próprio terminal/serviço cloud do fabricante,
// não uma sessão de browser.
//
// Corpo esperado (JSON): { employeeExternalId: string, type: PunchType, timestamp?: string }
// employeeExternalId corresponde a Employee.employeeNumber.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const equipment = await prisma.equipment.findUnique({ where: { webhookToken: token } });
  if (!equipment) {
    return NextResponse.json({ error: "Terminal desconhecido." }, { status: 404 });
  }
  if (!equipment.active) {
    return NextResponse.json({ error: "Terminal inativo." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo do pedido inválido (esperado JSON)." }, { status: 400 });
  }

  const { employeeExternalId, type, timestamp } = (body ?? {}) as {
    employeeExternalId?: string;
    type?: string;
    timestamp?: string;
  };

  if (!employeeExternalId || typeof employeeExternalId !== "string") {
    return NextResponse.json({ error: "employeeExternalId em falta." }, { status: 400 });
  }
  if (!type || !VALID_TYPES.includes(type as PunchType)) {
    return NextResponse.json(
      { error: `type inválido. Use um de: ${VALID_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.findUnique({ where: { employeeNumber: employeeExternalId } });
  if (!employee) {
    return NextResponse.json(
      { error: `Nenhum colaborador com número mecanográfico "${employeeExternalId}".` },
      { status: 404 }
    );
  }

  const ts = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) {
    return NextResponse.json({ error: "timestamp inválido." }, { status: 400 });
  }

  const entry = await recordTimeClockEntry({
    employeeId: employee.id,
    type: type as PunchType,
    timestamp: ts,
    terminalType: equipment.type,
    equipmentId: equipment.id,
  });

  await logAudit({
    action: "CLOCK",
    entity: "TimeClockEntry",
    entityId: entry.id,
    details: `${type} via terminal ${equipment.name} (${employee.firstName} ${employee.lastName})`,
  });

  return NextResponse.json({ ok: true, entryId: entry.id }, { status: 201 });
}
