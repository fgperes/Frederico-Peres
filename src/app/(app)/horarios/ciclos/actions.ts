"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { addDays, parseISO } from "date-fns";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { shiftDurationHours, minutesFromMidnight, shiftEndOffsetMinutes } from "@/lib/schedule";

async function assertCanWrite() {
  const user = await requireUser();
  if (!canWrite(user.roles, "horarios")) {
    throw new Error("Sem permissão para editar horários.");
  }
  return user;
}

// Next.js redige (em produção) a mensagem de qualquer erro que atravesse a
// fronteira de uma Server Action lançado com `throw` — mesmo apanhado com
// try/catch no cliente, só chega lá um texto genérico + digest. Por isso as
// ações chamadas diretamente do cliente (fora de um <form action> ligado a
// useActionState) devolvem este resultado em vez de lançarem exceções, para
// a mensagem real chegar ao utilizador.
type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ocorreu um erro." };
  }
}

// Impede nomes duplicados (ex.: cliques repetidos no botão antes do
// primeiro pedido terminar). Ciclos e modelos têm namespaces de nome
// independentes — a constraint em BD (@@unique([name, isTemplate])) é a
// rede de segurança final para dois pedidos verdadeiramente em simultâneo.
async function assertUniqueCycleName(name: string, isTemplate: boolean) {
  const existing = await prisma.scheduleCycle.findFirst({ where: { name, isTemplate } });
  if (existing) {
    throw new Error(
      isTemplate
        ? `Já existe um modelo com o nome "${name}".`
        : `Já existe um ciclo com o nome "${name}".`
    );
  }
}

// Rede de segurança para dois pedidos verdadeiramente em simultâneo que
// ambos passem o pre-check acima antes de qualquer um confirmar a escrita.
function duplicateNameError(e: unknown, name: string, isTemplate: boolean): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new Error(
      isTemplate
        ? `Já existe um modelo com o nome "${name}".`
        : `Já existe um ciclo com o nome "${name}".`
    );
  }
  throw e;
}

// Média de horas semanais implícita no padrão do ciclo (soma de todas as
// células com turno, dividida pelo número de semanas do ciclo). Recebe o
// padrão já carregado (em vez de o voltar a ler) para poupar um round-trip
// à BD — sob o connection_limit=1 do pooler do Supabase, cada round-trip a
// menos reduz o risco de esgotar o tempo de espera pela ligação.
function weeklyHoursFromPattern(
  pattern: { weekIndex: number; dayOfWeek: number; isDayOff: boolean; shiftTemplateId: string | null }[],
  templateMap: Map<string, { startTime: string; endTime: string; breakMins: number }>,
  weeks: number
): number {
  // Uma célula (semana/dia) só deve contar uma vez — defesa extra para além
  // da constraint em BD, caso ainda existam linhas duplicadas antigas. Fica
  // com a primeira (mesmo critério que a grelha usa para escolher qual
  // mostrar: `pattern.find(...)` em weeks-grid.tsx).
  const byCell = new Map<string, (typeof pattern)[number]>();
  for (const cell of pattern) {
    const key = `${cell.weekIndex}-${cell.dayOfWeek}`;
    if (!byCell.has(key)) byCell.set(key, cell);
  }

  let totalHours = 0;
  for (const cell of byCell.values()) {
    if (cell.isDayOff || !cell.shiftTemplateId) continue;
    const t = templateMap.get(cell.shiftTemplateId);
    if (!t) continue;
    totalHours += shiftDurationHours(t.startTime, t.endTime, t.breakMins);
  }
  return weeks > 0 ? totalHours / weeks : 0;
}

async function loadTemplateMap(cells: { shiftTemplateId: string | null }[]) {
  const templateIds = [...new Set(cells.map((c) => c.shiftTemplateId).filter((id): id is string => !!id))];
  const templates =
    templateIds.length > 0 ? await prisma.shiftTemplate.findMany({ where: { id: { in: templateIds } } }) : [];
  return new Map(templates.map((t) => [t.id, t]));
}

type PatternLikeCell = { weekIndex: number; dayOfWeek: number; isDayOff: boolean; shiftTemplateId: string | null };

// Preenche as 7 células de cada semana do padrão (uma célula em falta conta
// como folga), deduplicando por célula — protege contra eventuais linhas
// duplicadas antigas, tal como o resto do módulo.
function fillPattern(pattern: PatternLikeCell[], weeks: number): PatternLikeCell[] {
  const byCell = new Map<string, PatternLikeCell>();
  for (const cell of pattern) {
    const key = `${cell.weekIndex}-${cell.dayOfWeek}`;
    if (!byCell.has(key)) byCell.set(key, cell);
  }
  const filled: PatternLikeCell[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      filled.push(byCell.get(`${w}-${d}`) ?? { weekIndex: w, dayOfWeek: d, isDayOff: true, shiftTemplateId: null });
    }
  }
  return filled;
}

const MIN_REST_HOURS = 11;

// Código do Trabalho, art.º 214.º — descanso diário mínimo de 11 horas
// consecutivas entre o fim de um turno e o início do seguinte. Percorre o
// padrão como uma sequência cíclica contínua (o último dia liga ao
// primeiro, tal como acontece de facto para um colaborador associado de
// forma contínua ao ciclo) e devolve uma mensagem por cada par de dias
// consecutivos que não deixe esse descanso mínimo — ex.: turno da noite
// seguido, no dia seguinte, de turno da manhã.
function findRestViolations(
  pattern: PatternLikeCell[],
  templateMap: Map<string, { name: string; startTime: string; endTime: string }>,
  weeks: number
): string[] {
  const ordered = fillPattern(pattern, weeks);
  if (ordered.length === 0) return [];

  const violations: string[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    const next = ordered[(i + 1) % ordered.length];
    if (current.isDayOff || !current.shiftTemplateId) continue;
    if (next.isDayOff || !next.shiftTemplateId) continue;

    const currentTemplate = templateMap.get(current.shiftTemplateId);
    const nextTemplate = templateMap.get(next.shiftTemplateId);
    if (!currentTemplate || !nextTemplate) continue;

    const currentEnd = shiftEndOffsetMinutes(currentTemplate.startTime, currentTemplate.endTime);
    const nextStart = minutesFromMidnight(nextTemplate.startTime) + 24 * 60;
    const restHours = (nextStart - currentEnd) / 60;

    if (restHours < MIN_REST_HOURS) {
      violations.push(
        `Descanso insuficiente entre turnos (mínimo legal: ${MIN_REST_HOURS}h consecutivas): ` +
          `"${currentTemplate.name}" (Semana ${current.weekIndex + 1}, ${WEEKDAY_LABELS[current.dayOfWeek]}) ` +
          `seguido de "${nextTemplate.name}" (Semana ${next.weekIndex + 1}, ${WEEKDAY_LABELS[next.dayOfWeek]}) ` +
          `só deixa ${restHours.toFixed(1)}h de descanso.`
      );
    }
  }
  return violations;
}

function assertRestCompliance(
  pattern: PatternLikeCell[],
  templateMap: Map<string, { name: string; startTime: string; endTime: string }>,
  weeks: number
) {
  const violations = findRestViolations(pattern, templateMap, weeks);
  if (violations.length > 0) throw new Error(violations[0]);
}

const MAX_WEEKLY_HOURS = 40;

// Código do Trabalho, art.º 203.º — período normal de trabalho semanal de,
// em regra, 40 horas. Verifica cada semana do padrão isoladamente (não a
// média entre semanas — uma semana de 60h e outra de 20h teriam a mesma
// média de uma de 40h+40h, mas a primeira continua ilegal).
function findWeeklyHoursViolations(
  pattern: PatternLikeCell[],
  templateMap: Map<string, { startTime: string; endTime: string; breakMins: number }>,
  weeks: number
): string[] {
  const filled = fillPattern(pattern, weeks);
  const violations: string[] = [];
  for (let w = 0; w < weeks; w++) {
    let total = 0;
    for (const cell of filled) {
      if (cell.weekIndex !== w || cell.isDayOff || !cell.shiftTemplateId) continue;
      const t = templateMap.get(cell.shiftTemplateId);
      if (!t) continue;
      total += shiftDurationHours(t.startTime, t.endTime, t.breakMins);
    }
    if (total > MAX_WEEKLY_HOURS) {
      violations.push(
        `A Semana ${w + 1} do padrão tem ${total.toFixed(1)}h de trabalho — acima do máximo legal de ${MAX_WEEKLY_HOURS}h/semana (Código do Trabalho, art.º 203.º).`
      );
    }
  }
  return violations;
}

// Nº de dias sem turno (folga) em cada semana do padrão.
function folgasPerWeek(pattern: PatternLikeCell[], weeks: number): number[] {
  const filled = fillPattern(pattern, weeks);
  const perWeek = new Array(weeks).fill(0);
  for (const cell of filled) {
    if (cell.isDayOff || !cell.shiftTemplateId) perWeek[cell.weekIndex]++;
  }
  return perWeek;
}

// Código do Trabalho, art.º 205.º — descanso semanal mínimo. O nº de folgas
// exigido é o que está definido no contrato de cada colaborador
// (`weeklyRestDays`). Como o padrão é partilhado por todos os colaboradores
// associados ao ciclo, compara-se contra a semana do padrão com MENOS
// folgas — se essa semana já não chega para o colaborador mais exigente,
// nenhuma semana do ciclo garante o descanso contratual dele.
function findRestDaysViolations(
  pattern: PatternLikeCell[],
  weeks: number,
  employees: { firstName: string; lastName: string; weeklyRestDays: number }[]
): string[] {
  const perWeek = folgasPerWeek(pattern, weeks);
  const minFolgas = perWeek.length > 0 ? Math.min(...perWeek) : 0;
  const shortfall = employees.filter((e) => e.weeklyRestDays > minFolgas);
  if (shortfall.length === 0) return [];

  const names = shortfall
    .map((e) => `${e.firstName} ${e.lastName} (contrato exige ${e.weeklyRestDays} folga(s)/semana)`)
    .join(", ");
  return [
    `O padrão do ciclo tem uma semana com apenas ${minFolgas} folga(s) — não cumpre o descanso semanal contratual (art.º 205.º CT) de: ${names}.`,
  ];
}

async function loadContractedRestDays(employeeIds: string[]) {
  if (employeeIds.length === 0) return new Map<string, number>();
  const contracts = await prisma.contract.findMany({
    where: { employeeId: { in: employeeIds }, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });
  const map = new Map<string, number>();
  for (const c of contracts) {
    if (!map.has(c.employeeId)) map.set(c.employeeId, c.weeklyRestDays);
  }
  return map;
}

export async function createCycle(formData: FormData) {
  const user = await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  const weeks = Number(formData.get("weeks") ?? 2);
  const startDate = String(formData.get("startDate") ?? "");

  if (!name || !startDate) throw new Error("Nome e data de início obrigatórios.");
  await assertUniqueCycleName(name, false);

  const cycle = await prisma.scheduleCycle
    .create({ data: { name, weeks, startDate: parseISO(startDate) } })
    .catch((e) => duplicateNameError(e, name, false));

  await logAudit({ userId: user.id, action: "CREATE", entity: "ScheduleCycle", entityId: cycle.id, details: name });
  revalidatePath("/horarios/ciclos");
}

export type CreateCycleState = { error?: string };

// Wrapper para useActionState — o formulário "Novo Ciclo" precisa de
// mostrar o erro (ex.: permissões, dados em falta) em vez de falhar em
// silêncio, que é o que acontecia com o form ligado diretamente a
// createCycle (uma exceção não tratada não dá qualquer feedback visível).
export async function createCycleAction(
  _prev: CreateCycleState,
  formData: FormData
): Promise<CreateCycleState> {
  try {
    await createCycle(formData);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar o ciclo." };
  }
}

// Adiciona uma semana em branco ao fim do ciclo.
export async function addWeek(cycleId: string): Promise<ActionResult<number>> {
  return safe(async () => {
    const user = await assertCanWrite();
    const cycle = await prisma.scheduleCycle.update({
      where: { id: cycleId },
      data: { weeks: { increment: 1 } },
    });
    await logAudit({ userId: user.id, action: "ADD_WEEK", entity: "ScheduleCycle", entityId: cycleId });
    revalidatePath(`/horarios/ciclos/${cycleId}`);
    return cycle.weeks;
  });
}

// Duplica uma semana existente para uma nova semana no fim do ciclo.
export async function duplicateWeek(cycleId: string, sourceWeekIndex: number): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { pattern: true },
    });
    const newWeekIndex = cycle.weeks;
    // Uma célula por dia, mesmo que existam linhas duplicadas antigas para o
    // mesmo dia — caso contrário a duplicação de semana propagaria o
    // duplicado (e as horas a mais) para a semana nova.
    const seenDays = new Set<number>();
    const sourceCells = cycle.pattern.filter((p) => {
      if (p.weekIndex !== sourceWeekIndex || seenDays.has(p.dayOfWeek)) return false;
      seenDays.add(p.dayOfWeek);
      return true;
    });

    const newCells = sourceCells.map((cell) => ({
      weekIndex: newWeekIndex,
      dayOfWeek: cell.dayOfWeek,
      shiftTemplateId: cell.shiftTemplateId,
      isDayOff: cell.isDayOff,
    }));
    const simulated = [...cycle.pattern, ...newCells];
    const templateMap = await loadTemplateMap(simulated);
    assertRestCompliance(simulated, templateMap, cycle.weeks + 1);

    await prisma.$transaction([
      prisma.scheduleCycle.update({ where: { id: cycleId }, data: { weeks: { increment: 1 } } }),
      ...sourceCells.map((cell) =>
        prisma.scheduleCyclePattern.create({
          data: {
            cycleId,
            weekIndex: newWeekIndex,
            dayOfWeek: cell.dayOfWeek,
            shiftTemplateId: cell.shiftTemplateId,
            isDayOff: cell.isDayOff,
          },
        })
      ),
    ]);

    await logAudit({ userId: user.id, action: "DUPLICATE_WEEK", entity: "ScheduleCycle", entityId: cycleId });
    revalidatePath(`/horarios/ciclos/${cycleId}`);
  });
}

// Remove a última semana do ciclo (apaga o respetivo padrão).
export async function removeWeek(cycleId: string, weekIndex: number): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { pattern: true },
    });
    if (cycle.weeks <= 1) throw new Error("O ciclo tem de ter pelo menos uma semana.");

    // Lida-se com a leitura fora da transação e agrupam-se as escritas num só
    // pedido em lote (em vez de uma transação interativa com um loop de
    // updates sequenciais) — reduz drasticamente o tempo em que a transação
    // precisa de segurar a ligação à BD, que sob carga (ex.: ligação com
    // connection_limit=1 do pooler do Supabase) estava a esgotar o tempo de
    // espera para iniciar a transação (P2028).
    const kept = cycle.pattern.filter((p) => p.weekIndex < weekIndex);
    const remaining = cycle.pattern.filter((p) => p.weekIndex > weekIndex);
    const shifted = remaining.map((p) => ({ ...p, weekIndex: p.weekIndex - 1 }));

    // Remover uma semana pode juntar duas semanas que antes não eram
    // vizinhas — confirma que o resultado continua a cumprir o descanso
    // mínimo entre turnos antes de gravar.
    const templateMap = await loadTemplateMap([...kept, ...shifted]);
    assertRestCompliance([...kept, ...shifted], templateMap, cycle.weeks - 1);

    await prisma.$transaction([
      prisma.scheduleCyclePattern.deleteMany({ where: { cycleId, weekIndex } }),
      ...remaining.map((cell) =>
        prisma.scheduleCyclePattern.update({
          where: { id: cell.id },
          data: { weekIndex: cell.weekIndex - 1 },
        })
      ),
      prisma.scheduleCycle.update({ where: { id: cycleId }, data: { weeks: { decrement: 1 } } }),
    ]);

    await logAudit({ userId: user.id, action: "REMOVE_WEEK", entity: "ScheduleCycle", entityId: cycleId });
    revalidatePath(`/horarios/ciclos/${cycleId}`);
  });
}

// Reordena as semanas do ciclo (drag-and-drop). `order` é a lista dos
// índices atuais na nova ordem pretendida, ex.: [2,0,1].
export async function reorderWeeks(cycleId: string, order: number[]): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { pattern: true },
    });
    if (order.length !== cycle.weeks) throw new Error("Ordem de semanas inválida.");

    // Reordenar semanas pode juntar dois dias que antes não eram vizinhos —
    // confirma que a nova ordem continua a cumprir o descanso mínimo entre
    // turnos antes de gravar.
    const simulated = cycle.pattern.map((p) => ({ ...p, weekIndex: order.indexOf(p.weekIndex) }));
    const templateMap = await loadTemplateMap(simulated);
    assertRestCompliance(simulated, templateMap, cycle.weeks);

    // Usa índices temporários (offset) para evitar colisões durante a escrita.
    const OFFSET = 1000;
    await prisma.$transaction([
      ...cycle.pattern.map((cell) =>
        prisma.scheduleCyclePattern.update({
          where: { id: cell.id },
          data: { weekIndex: cell.weekIndex + OFFSET },
        })
      ),
    ]);

    const updates = [];
    for (let newIndex = 0; newIndex < order.length; newIndex++) {
      const oldIndex = order[newIndex];
      updates.push(
        prisma.scheduleCyclePattern.updateMany({
          where: { cycleId, weekIndex: oldIndex + OFFSET },
          data: { weekIndex: newIndex },
        })
      );
    }
    await prisma.$transaction(updates);

    await logAudit({ userId: user.id, action: "REORDER_WEEKS", entity: "ScheduleCycle", entityId: cycleId });
    revalidatePath(`/horarios/ciclos/${cycleId}`);
  });
}

// Guarda o ciclo atual como modelo reutilizável (só o padrão, sem
// colaboradores associados nem data de início específica).
export async function saveAsTemplate(cycleId: string, formData: FormData): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const name = String(formData.get("templateName") ?? "").trim();
    if (!name) throw new Error("Indique um nome para o modelo.");
    await assertUniqueCycleName(name, true);

    const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
      where: { id: cycleId },
      include: { pattern: true },
    });

    const template = await prisma.scheduleCycle
      .create({
        data: {
          name,
          weeks: cycle.weeks,
          startDate: new Date(),
          isTemplate: true,
          pattern: {
            create: cycle.pattern.map((p) => ({
              weekIndex: p.weekIndex,
              dayOfWeek: p.dayOfWeek,
              shiftTemplateId: p.shiftTemplateId,
              isDayOff: p.isDayOff,
            })),
          },
        },
      })
      .catch((e) => duplicateNameError(e, name, true));

    await logAudit({ userId: user.id, action: "SAVE_TEMPLATE", entity: "ScheduleCycle", entityId: template.id, details: name });
    revalidatePath("/horarios/ciclos");
    revalidatePath(`/horarios/ciclos/${cycleId}`);
  });
}

// Cria um novo ciclo "ao vivo" a partir de um modelo pré-definido.
export async function createCycleFromTemplate(formData: FormData): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    const templateId = String(formData.get("templateId"));
    const name = String(formData.get("name") ?? "").trim();
    const startDate = String(formData.get("startDate") ?? "");

    if (!name || !startDate) throw new Error("Nome e data de início obrigatórios.");
    await assertUniqueCycleName(name, false);

    const template = await prisma.scheduleCycle.findUniqueOrThrow({
      where: { id: templateId },
      include: { pattern: true },
    });

    const cycle = await prisma.scheduleCycle
      .create({
        data: {
          name,
          weeks: template.weeks,
          startDate: parseISO(startDate),
          isTemplate: false,
          pattern: {
            create: template.pattern.map((p) => ({
              weekIndex: p.weekIndex,
              dayOfWeek: p.dayOfWeek,
              shiftTemplateId: p.shiftTemplateId,
              isDayOff: p.isDayOff,
            })),
          },
        },
      })
      .catch((e) => duplicateNameError(e, name, false));

    await logAudit({ userId: user.id, action: "CREATE_FROM_TEMPLATE", entity: "ScheduleCycle", entityId: cycle.id, details: name });
    revalidatePath("/horarios/ciclos");
  });
}

export type PatternCellInput = { weekIndex: number; dayOfWeek: number; shiftTemplateId: string | null };

// Grava o padrão inteiro do ciclo de uma vez (chamado pelo botão "Guardar
// alterações" da grelha) em vez de gravar célula a célula à medida que se
// edita — isso obrigava a validar (e possivelmente bloquear) a cada clique,
// mesmo a meio de uma edição ainda incompleta. Valida tudo em conjunto e
// devolve todos os problemas encontrados de uma vez, não só o primeiro.
export async function savePattern(cycleId: string, cells: PatternCellInput[]): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();

    const [cycle, assignments] = await Promise.all([
      prisma.scheduleCycle.findUniqueOrThrow({ where: { id: cycleId } }),
      prisma.scheduleCycleAssignment.findMany({ where: { cycleId } }),
    ]);

    const pattern: PatternLikeCell[] = cells.map((c) => ({
      weekIndex: c.weekIndex,
      dayOfWeek: c.dayOfWeek,
      isDayOff: !c.shiftTemplateId,
      shiftTemplateId: c.shiftTemplateId,
    }));

    const assignedEmployeeIds = assignments.map((a) => a.employeeId);
    const [hoursTemplateMap, restDaysByEmployee, assignedEmployees] = await Promise.all([
      loadTemplateMap(pattern),
      loadContractedRestDays(assignedEmployeeIds),
      assignedEmployeeIds.length > 0
        ? prisma.employee.findMany({ where: { id: { in: assignedEmployeeIds } } })
        : Promise.resolve([]),
    ]);

    const violations = [
      ...findRestViolations(pattern, hoursTemplateMap, cycle.weeks),
      ...findWeeklyHoursViolations(pattern, hoursTemplateMap, cycle.weeks),
      ...findRestDaysViolations(
        pattern,
        cycle.weeks,
        assignedEmployees.map((e) => ({
          firstName: e.firstName,
          lastName: e.lastName,
          weeklyRestDays: restDaysByEmployee.get(e.id) ?? 1,
        }))
      ),
    ];
    if (violations.length > 0) throw new Error(violations.join("\n"));

    await prisma.$transaction([
      prisma.scheduleCyclePattern.deleteMany({ where: { cycleId } }),
      ...cells
        .filter((c) => c.shiftTemplateId)
        .map((c) =>
          prisma.scheduleCyclePattern.create({
            data: { cycleId, weekIndex: c.weekIndex, dayOfWeek: c.dayOfWeek, shiftTemplateId: c.shiftTemplateId },
          })
        ),
    ]);

    await logAudit({ userId: user.id, action: "UPDATE", entity: "ScheduleCyclePattern", entityId: cycleId });
    revalidatePath(`/horarios/ciclos/${cycleId}`);
  });
}

// Associa vários colaboradores de uma vez ao ciclo, todos a começar na
// mesma semana do ciclo (offsetWeeks). Valida que a carga semanal
// contratada de cada colaborador corresponde à média semanal do padrão
// do ciclo — se não corresponder, rejeita o pedido todo com uma mensagem
// que identifica quem está em desacordo, para o gestor poder corrigir a
// seleção (ex.: remover esse colaborador ou escolher outro ciclo).
type AssignedRow = { id: string; employeeId: string; offsetWeeks: number; firstName: string; lastName: string };

export async function assignEmployeesToCycle(
  cycleId: string,
  employeeIds: string[],
  offsetWeeks: number
): Promise<ActionResult<AssignedRow[]>> {
  return safe(async () => {
    const user = await assertCanWrite();
    if (employeeIds.length === 0) throw new Error("Selecione pelo menos um colaborador.");

    const [cycle, employees, existing, otherAssignments, restDaysByEmployee] = await Promise.all([
      prisma.scheduleCycle.findUniqueOrThrow({ where: { id: cycleId }, include: { pattern: true } }),
      prisma.employee.findMany({ where: { id: { in: employeeIds } } }),
      prisma.scheduleCycleAssignment.findMany({ where: { cycleId, employeeId: { in: employeeIds } } }),
      prisma.scheduleCycleAssignment.findMany({
        where: { employeeId: { in: employeeIds }, cycleId: { not: cycleId } },
        include: { cycle: true },
      }),
      loadContractedRestDays(employeeIds),
    ]);
    if (offsetWeeks < 0 || offsetWeeks >= cycle.weeks) {
      throw new Error("Semana de início do ciclo inválida.");
    }

    // Um colaborador só pode estar associado a um ciclo de cada vez — caso
    // contrário teria dois padrões de turnos a valer ao mesmo tempo.
    if (otherAssignments.length > 0) {
      const byEmployee = new Map<string, Set<string>>();
      for (const a of otherAssignments) {
        const names = byEmployee.get(a.employeeId) ?? new Set<string>();
        names.add(a.cycle.name);
        byEmployee.set(a.employeeId, names);
      }
      const names = [...byEmployee.entries()]
        .map(([employeeId, cycleNames]) => {
          const e = employees.find((emp) => emp.id === employeeId)!;
          return `${e.firstName} ${e.lastName} (já associado ao ciclo "${[...cycleNames].join('", "')}")`;
        })
        .join(", ");
      throw new Error(`Colaboradores já associados a outro ciclo: ${names}.`);
    }

    const templateIds = [
      ...new Set(cycle.pattern.map((p) => p.shiftTemplateId).filter((id): id is string => !!id)),
    ];
    const templates =
      templateIds.length > 0
        ? await prisma.shiftTemplate.findMany({ where: { id: { in: templateIds } } })
        : [];
    const templateMap = new Map(templates.map((t) => [t.id, t]));
    const avgWeeklyHours = weeklyHoursFromPattern(cycle.pattern, templateMap, cycle.weeks);

    const mismatched = employees.filter((e) => Math.abs(e.weeklyHours - avgWeeklyHours) > 0.01);
    if (mismatched.length > 0) {
      const names = mismatched
        .map((e) => `${e.firstName} ${e.lastName} (${e.weeklyHours}h/semana)`)
        .join(", ");
      throw new Error(
        `A carga semanal não corresponde à do ciclo (${avgWeeklyHours.toFixed(1)}h/semana em média): ${names}.`
      );
    }

    const restDaysViolations = findRestDaysViolations(
      cycle.pattern,
      cycle.weeks,
      employees.map((e) => ({
        firstName: e.firstName,
        lastName: e.lastName,
        weeklyRestDays: restDaysByEmployee.get(e.id) ?? 1,
      }))
    );
    if (restDaysViolations.length > 0) throw new Error(restDaysViolations.join(" "));

    const alreadyAssigned = new Set(existing.map((a) => a.employeeId));
    const toAssign = employees.filter((e) => !alreadyAssigned.has(e.id));

    if (toAssign.length === 0) {
      throw new Error("Os colaboradores selecionados já estão associados a este ciclo.");
    }

    const created = await prisma.$transaction(
      toAssign.map((e) =>
        prisma.scheduleCycleAssignment.create({ data: { cycleId, employeeId: e.id, offsetWeeks } })
      )
    );

    await logAudit({
      userId: user.id,
      action: "CREATE",
      entity: "ScheduleCycleAssignment",
      entityId: cycleId,
      details: `${created.length} colaborador(es), semana +${offsetWeeks}`,
    });
    revalidatePath(`/horarios/ciclos/${cycleId}`);

    return created.map((a) => {
      const e = toAssign.find((emp) => emp.id === a.employeeId)!;
      return {
        id: a.id,
        employeeId: a.employeeId,
        offsetWeeks: a.offsetWeeks,
        firstName: e.firstName,
        lastName: e.lastName,
      };
    });
  });
}

export async function removeAssignment(assignmentId: string, cycleId: string): Promise<ActionResult> {
  return safe(async () => {
    const user = await assertCanWrite();
    await prisma.scheduleCycleAssignment.delete({ where: { id: assignmentId } });
    await logAudit({ userId: user.id, action: "DELETE", entity: "ScheduleCycleAssignment", entityId: assignmentId });
    revalidatePath(`/horarios/ciclos/${cycleId}`);
  });
}

// HC-03: gera automaticamente as escalas futuras com base no ciclo definido,
// respeitando ausências já aprovadas (HC-05 sinaliza o conflito ao ignorar o dia).
export async function generateCycleSchedule(cycleId: string, horizonWeeks: number) {
  const user = await assertCanWrite();

  const cycle = await prisma.scheduleCycle.findUniqueOrThrow({
    where: { id: cycleId },
    include: { pattern: true, assignments: true },
  });

  let created = 0;
  let skippedDueToAbsence = 0;

  for (const assignment of cycle.assignments) {
    for (let w = 0; w < horizonWeeks; w++) {
      const cycleWeekIndex = (w + assignment.offsetWeeks) % cycle.weeks;
      const weekStart = addDays(cycle.startDate, w * 7);

      for (let dow = 0; dow < 7; dow++) {
        const patternCell = cycle.pattern.find(
          (p) => p.weekIndex === cycleWeekIndex && p.dayOfWeek === dow
        );
        if (!patternCell || patternCell.isDayOff || !patternCell.shiftTemplateId) continue;

        const date = addDays(weekStart, dow);

        const approvedAbsence = await prisma.absence.findFirst({
          where: {
            employeeId: assignment.employeeId,
            status: "APPROVED",
            startDate: { lte: date },
            endDate: { gte: date },
          },
        });
        if (approvedAbsence) {
          skippedDueToAbsence++;
          continue;
        }

        const exists = await prisma.shift.findFirst({
          where: { employeeId: assignment.employeeId, date },
        });
        if (exists) continue;

        const template = await prisma.shiftTemplate.findUnique({
          where: { id: patternCell.shiftTemplateId },
        });
        if (!template) continue;

        await prisma.shift.create({
          data: {
            employeeId: assignment.employeeId,
            date,
            startTime: template.startTime,
            endTime: template.endTime,
            shiftTemplateId: template.id,
            source: "CYCLE",
            status: "DRAFT",
          },
        });
        created++;
      }
    }
  }

  await logAudit({
    userId: user.id,
    action: "GENERATE",
    entity: "ScheduleCycle",
    entityId: cycleId,
    details: `${created} turnos gerados, ${skippedDueToAbsence} ignorados por ausência aprovada`,
  });

  revalidatePath("/horarios");
  revalidatePath(`/horarios/ciclos/${cycleId}`);

  return { created, skippedDueToAbsence };
}

export type GenerateState = {
  result?: { created: number; skippedDueToAbsence: number };
  error?: string;
};

export async function generateCycleScheduleAction(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const cycleId = String(formData.get("cycleId"));
  const horizonWeeks = Number(formData.get("horizonWeeks") ?? 4);
  try {
    const result = await generateCycleSchedule(cycleId, horizonWeeks);
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar escalas." };
  }
}
