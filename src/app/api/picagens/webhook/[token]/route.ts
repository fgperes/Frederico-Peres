import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordTimeClockEntry, type PunchType } from "@/lib/timeclock";
import { logAudit } from "@/lib/audit";

const VALID_TYPES: PunchType[] = ["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"];

// Lê um campo do corpo do pedido pelo nome configurado no equipamento —
// aceita um caminho simples com pontos (ex.: "data.badge_id") para
// fabricantes que aninham os dados, sem precisar de nenhuma configuração
// extra além do nome do campo.
function readField(body: Record<string, unknown>, fieldPath: string): unknown {
  return fieldPath
    .split(".")
    .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), body);
}

// Endpoint de integração para terminais físicos de picagem (biométrico,
// RFID, PIN, etc.). Cada equipamento tem um token único (Equipment.webhookToken)
// que identifica de onde vem a picagem — não há autenticação de utilizador
// aqui porque quem chama é o próprio terminal/serviço cloud do fabricante,
// não uma sessão de browser.
//
// Só 3 campos do corpo do pedido são lidos e gravados — quais, é definido
// por equipamento em Picagens → Terminais (Equipment.payloadEmployeeField/
// payloadTypeField/payloadTimestampField, por omissão "employeeExternalId"/
// "type"/"timestamp"). Todo o resto do corpo do pedido é ignorado.
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
  const bodyObj = (body ?? {}) as Record<string, unknown>;

  const employeeExternalId = readField(bodyObj, equipment.payloadEmployeeField);
  const type = readField(bodyObj, equipment.payloadTypeField);
  const timestamp = readField(bodyObj, equipment.payloadTimestampField);

  if (!employeeExternalId || typeof employeeExternalId !== "string") {
    return NextResponse.json(
      { error: `Campo "${equipment.payloadEmployeeField}" (identificador do colaborador) em falta ou inválido.` },
      { status: 400 }
    );
  }
  if (!type || typeof type !== "string" || !VALID_TYPES.includes(type as PunchType)) {
    return NextResponse.json(
      { error: `Campo "${equipment.payloadTypeField}" inválido. Use um de: ${VALID_TYPES.join(", ")}.` },
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

  const ts =
    typeof timestamp === "string" || typeof timestamp === "number" ? new Date(timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) {
    return NextResponse.json({ error: `Campo "${equipment.payloadTimestampField}" com data/hora inválida.` }, { status: 400 });
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
