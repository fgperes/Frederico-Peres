/**
 * Apaga todos os dados "de pessoas" (colaboradores, utilizadores, estrutura
 * organizacional, contratos, ausências, férias, avaliações, payroll) e
 * recria-os a partir do dataset fictício de 500 colaboradores em
 * scripts/data/people4people-dataset.json — PRESERVANDO por completo os
 * dados e o acesso de Tomás Peres (tomasperes@sgth.pt) e de Frederico Peres
 * (fred.gp92@gmail.com).
 *
 * NÃO TOCA em catálogos globais/configuração: AbsenceType (só faz upsert dos
 * tipos comuns + garante que "Férias" existe, nunca apaga), ShiftTemplate,
 * ContractProfile, Holiday, PayrollSettings, IrsTable/IrsBracket,
 * PayslipLayoutSettings, ModuleSubscription, DocumentBrandingSettings,
 * ContractTypeDefinition, RoleDefinition, RolePermission, Equipment (só
 * desliga-o do departamento antigo, não o apaga).
 *
 * Departamentos, Locais e Equipas SÃO apagados e recriados exatamente como
 * no Excel/JSON (decisão confirmada com o utilizador) — os dois
 * colaboradores preservados ficam temporariamente sem departamento/equipa/
 * local durante a operação e são reatribuídos no final a IT / Lisboa /
 * "IT - Lisboa" (a nova equipa correspondente ao seu perfil de
 * Administrador do Sistema).
 *
 * IMPORTANTE — IRREVERSÍVEL: isto apaga dados reais da base de dados ligada
 * a DATABASE_URL. Faça uma cópia de segurança antes de correr. Corre-se com
 * duas flags obrigatórias (nenhuma delas corre por omissão):
 *
 *   npx tsx scripts/reset-and-seed-demo-data.ts --dry-run     (não escreve nada, só mostra o que faria)
 *   npx tsx scripts/reset-and-seed-demo-data.ts --confirm     (executa de verdade)
 *
 * Não é atómico de ponta a ponta (ver nota no fim do ficheiro) — mas a fase
 * de apagar é sempre "apaga tudo o que não é preservado", por isso correr o
 * script outra vez do zero depois de uma falha a meio limpa e recomeça de
 * forma segura.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const DATA_PATH = path.join(__dirname, "data", "people4people-dataset.json");

// Os dois colaboradores cujo acesso e dados têm de sobreviver intactos.
const PRESERVED_EMAILS = ["fred.gp92@gmail.com", "tomasperes@sgth.pt"];

// Onde os dois colaboradores preservados ficam reatribuídos depois da
// estrutura organizacional ser recriada (coerente com o seu perfil de
// Administrador do Sistema).
const PRESERVED_DEFAULT_DEPARTMENT = "IT";
const PRESERVED_DEFAULT_LOCATION = "Lisboa";
const PRESERVED_DEFAULT_TEAM = "IT - Lisboa";

// ---------------------------------------------------------------------------
// Tipos do dataset (ver scripts/data/people4people-dataset.json)
// ---------------------------------------------------------------------------

type Dataset = {
  departamentos: { nome: string; horario: string; locais: string }[];
  locais: {
    nome: string;
    address: string;
    postalCode: string;
    municipality: string;
    district: string;
    sede: "Sim" | "Não";
  }[];
  equipas: { nome: string; departamento: string; local: string; n_colaboradores: number }[];
  colaboradores: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    nif: string;
    phone: string;
    birthDate: string;
    jobTitle: string;
    funcao: string;
    department: string;
    location: string;
    team: string;
    employmentType: string;
    weeklyHours: number;
    hireDate: string;
    maritalStatus: string;
    dependents: number;
    fiscalRegion: string;
    mealAllowanceOverride: number;
  }[];
  perfis_acessos: {
    employeeNumber: string;
    nome_completo: string;
    email: string;
    senha_inicial: string;
    mustChangePassword: "Sim" | "Não";
    perfis: string;
    departamento_gestor: string | "";
  }[];
  perfis_contrato: {
    nome: string;
    contractType: string;
    weeklyHours: number;
    weeklyRestDays: number;
    worksWeekends: "Sim" | "Não";
    worksHolidays: "Sim" | "Não";
    departamentos_tipicos: string;
  }[];
  contratos_atribuidos: {
    employeeNumber: string;
    nome_completo: string;
    perfil_contrato: string;
    startDate: string;
    baseSalary: number;
    trialPeriodEndDate: string | "";
  }[];
  modelos_turno: {
    name: string;
    startTime: string;
    endTime: string;
    breakMins: number;
    color: string;
    utilizacao: string;
  }[];
  ciclos_horario: {
    ciclo: string;
    semanas: number;
    weekIndex: number;
    dayOfWeek: number;
    dia: string;
    turno_ou_folga: string;
  }[];
  atribuicao_ciclos: { employeeNumber: string; nome_completo: string; ciclo: string; offsetWeeks: number }[];
  tipos_ausencia: {
    name: string;
    unitType: string;
    annualLimitDays: number | null;
    requiresDocument: boolean;
    salaryImpactPercent: number;
    affectsBalance: boolean;
  }[];
  ausencias_historicas: {
    employeeNumber: string;
    nome_completo: string;
    tipo_ausencia: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
  }[];
  saldo_ferias: { employeeNumber: string; nome_completo: string; year: number; entitledDays: number; carryOverDays: number }[];
  ferias_dias_aprovados_2026: { employeeNumber: string; nome_completo: string; date: string; status: string }[];
  avaliacoes_modelos: {
    template: string;
    hasSelfEvaluation: "Sim" | "Não";
    pergunta: string;
    tipo: string;
    peso: number;
    scaleMin: number;
    scaleMax: number;
  }[];
  avaliacoes_consequencias: { template: string; minPercent: number; consequencia: string }[];
  avaliacoes_atribuicoes: { employeeNumber: string; nome_completo: string; template: string }[];
  avaliacoes_instancias: {
    employeeNumber: string;
    nome_completo: string;
    template: string;
    scheduledDate: string;
    status: string;
    managerScore: number | "";
    managerPercent: number | "";
    managerConsequence: string | "";
  }[];
  payroll_componentes: {
    employeeNumber: string;
    nome_completo: string;
    name: string;
    type: string;
    amount: number;
    recurring: "Sim" | "Não";
    applyYear: number | "";
    applyMonth: number | "";
  }[];
};

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function emptyToNull<T>(v: T | ""): T | null {
  return v === "" ? null : (v as T);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function createManyChunked<T>(
  label: string,
  rows: T[],
  fn: (batch: T[]) => Promise<unknown>,
  size = 1000
) {
  const batches = chunk(rows, size);
  for (let i = 0; i < batches.length; i++) {
    await fn(batches[i]);
    console.log(`  ${label}: lote ${i + 1}/${batches.length} (${batches[i].length} linhas)`);
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirmed = args.includes("--confirm");

  if (!dryRun && !confirmed) {
    console.error(
      "\nESTE SCRIPT APAGA DADOS REAIS. Nada corre por omissão.\n" +
        "Use --dry-run para só ver o que seria feito, ou --confirm para executar de verdade.\n" +
        "Exemplo: npx tsx scripts/reset-and-seed-demo-data.ts --confirm\n"
    );
    process.exit(1);
  }

  const dataset: Dataset = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  console.log(`Dataset carregado de ${DATA_PATH}`);
  console.log(
    `  ${dataset.colaboradores.length} colaboradores, ${dataset.departamentos.length} departamentos, ` +
      `${dataset.locais.length} locais, ${dataset.equipas.length} equipas, ` +
      `${dataset.ferias_dias_aprovados_2026.length} dias de férias, ${dataset.ausencias_historicas.length} ausências históricas.`
  );

  // -------------------------------------------------------------------------
  // Fase 0 — resolver quem fica preservado
  // -------------------------------------------------------------------------
  const preservedUsers = await prisma.user.findMany({
    where: { email: { in: PRESERVED_EMAILS } },
    include: { employee: true },
  });
  if (preservedUsers.length === 0) {
    throw new Error(
      `Nenhum dos emails a preservar (${PRESERVED_EMAILS.join(", ")}) foi encontrado na base de dados. ` +
        "A abortar sem tocar em nada — confirme os emails antes de correr novamente."
    );
  }
  for (const email of PRESERVED_EMAILS) {
    if (!preservedUsers.some((u) => u.email === email)) {
      console.warn(`AVISO: ${email} não foi encontrado — a continuar sem o preservar (porque não existe).`);
    }
  }

  const preservedUserIds = preservedUsers.map((u) => u.id);
  const preservedEmployeeIds = preservedUsers.filter((u) => u.employee).map((u) => u.employee!.id);
  // Utilizador preservado usado como responsável/autor de dados em lote
  // (ex.: quem "aprovou" os dias de férias importados) — o primeiro da
  // lista de emails preservados que de facto existe.
  const fallbackAdminUserId =
    preservedUsers.find((u) => u.email === PRESERVED_EMAILS[0])?.id ?? preservedUsers[0].id;

  console.log(
    `Preservados: ${preservedUsers.map((u) => `${u.name} <${u.email}>`).join("; ")} ` +
      `(${preservedEmployeeIds.length} com ficha de colaborador).`
  );

  if (dryRun) {
    console.log("\n--dry-run: a mostrar só contagens, sem escrever nada.\n");
    const [userCount, employeeCount, deptCount, teamCount, locCount] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.department.count(),
      prisma.team.count(),
      prisma.location.count(),
    ]);
    console.log(`Atualmente na BD: ${userCount} utilizadores, ${employeeCount} colaboradores, ${deptCount} departamentos, ${teamCount} equipas, ${locCount} locais.`);
    console.log(
      `Seriam apagados: ${userCount - preservedUserIds.length} utilizadores, ${employeeCount - preservedEmployeeIds.length} colaboradores, ` +
        `todos os ${deptCount} departamentos/${teamCount} equipas/${locCount} locais (recriados a seguir como no Excel).`
    );
    console.log(`Seriam criados: ${dataset.colaboradores.length} colaboradores novos + toda a estrutura/ausências/férias/avaliações/payroll do dataset.`);
    console.log("\nNada foi alterado (--dry-run). Corra com --confirm para executar.");
    return;
  }

  // -------------------------------------------------------------------------
  // Fase 1 — desligar os preservados da estrutura organizacional antiga
  // (vai ser toda apagada e recriada) e de referências a utilizadores que
  // vão deixar de existir.
  // -------------------------------------------------------------------------
  console.log("\nFase 1/9 — a desligar os colaboradores preservados da estrutura antiga...");

  await prisma.employee.updateMany({
    where: { id: { in: preservedEmployeeIds } },
    data: { departmentId: null, teamId: null, locationId: null },
  });
  await prisma.userRole.updateMany({
    where: { userId: { in: preservedUserIds } },
    data: { departmentId: null },
  });

  // Linhas que pertencem aos preservados mas foram criadas/decididas por um
  // utilizador que vai ser apagado a seguir — reatribui-se ao responsável de
  // fallback em vez de perder a linha (FK obrigatória nalguns casos).
  if (preservedEmployeeIds.length > 0) {
    await prisma.absence.updateMany({
      where: { employeeId: { in: preservedEmployeeIds }, requestedById: { notIn: preservedUserIds } },
      data: { requestedById: fallbackAdminUserId },
    });
    await prisma.absence.updateMany({
      where: {
        employeeId: { in: preservedEmployeeIds },
        approvedById: { notIn: preservedUserIds, not: null },
      },
      data: { approvedById: fallbackAdminUserId },
    });
    await prisma.timeClockEntry.updateMany({
      where: {
        employeeId: { in: preservedEmployeeIds },
        reviewedById: { notIn: preservedUserIds, not: null },
      },
      data: { reviewedById: null },
    });
    await prisma.hoursCorrection.updateMany({
      where: { employeeId: { in: preservedEmployeeIds }, createdById: { notIn: preservedUserIds } },
      data: { createdById: fallbackAdminUserId },
    });
    await prisma.timeClockDayDecision.updateMany({
      where: { employeeId: { in: preservedEmployeeIds }, createdById: { notIn: preservedUserIds } },
      data: { createdById: fallbackAdminUserId },
    });
    await prisma.hourPoolMovement.updateMany({
      where: { employeeId: { in: preservedEmployeeIds }, createdById: { notIn: preservedUserIds } },
      data: { createdById: fallbackAdminUserId },
    });
    await prisma.hourPoolMovement.updateMany({
      where: {
        employeeId: { in: preservedEmployeeIds },
        reversedById: { notIn: preservedUserIds, not: null },
      },
      data: { reversedById: null },
    });
    await prisma.evaluation.updateMany({
      where: { employeeId: { in: preservedEmployeeIds }, createdById: { notIn: preservedUserIds } },
      data: { createdById: fallbackAdminUserId },
    });
    await prisma.evaluation.updateMany({
      where: {
        employeeId: { in: preservedEmployeeIds },
        managerCompletedById: { notIn: preservedUserIds, not: null },
      },
      data: { managerCompletedById: null },
    });
    await prisma.anniversaryComment.updateMany({
      where: { employeeId: { in: preservedEmployeeIds }, authorId: { notIn: preservedUserIds } },
      data: { authorId: fallbackAdminUserId },
    });
  }

  // -------------------------------------------------------------------------
  // Fase 2 — apagar todos os dados de colaboradores/utilizadores NÃO
  // preservados, do mais dependente para o menos dependente.
  // -------------------------------------------------------------------------
  console.log("Fase 2/9 — a apagar colaboradores/utilizadores não preservados...");

  const nonPreservedEmployee = { id: { notIn: preservedEmployeeIds } } as const;
  const nonPreservedUser = { notIn: preservedUserIds } as const;

  await prisma.task.deleteMany({
    where: { OR: [{ assigneeId: nonPreservedUser }, { employeeId: { notIn: preservedEmployeeIds } }] },
  });
  await prisma.timeClockDayDecision.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.hourPoolMovement.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.timeClockEntry.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.hoursCorrection.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.shift.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.scheduleCycleAssignment.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.absence.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.absenceBalance.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.task.deleteMany({ where: { evaluation: { employeeId: nonPreservedEmployee.id } } });
  await prisma.evaluation.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.employeeContract.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.payslip.deleteMany({ where: { employeeId: nonPreservedEmployee.id } });
  await prisma.news.deleteMany({ where: { authorId: nonPreservedUser } });
  await prisma.documentTemplate.deleteMany({ where: { createdById: nonPreservedUser } });
  await prisma.importLog.deleteMany({ where: { userId: { notIn: preservedUserIds, not: null } } });
  await prisma.auditLog.deleteMany({ where: { userId: { notIn: preservedUserIds, not: null } } });

  // EmployeeHistory, EmployeeDocument, PayrollComponent, AnniversaryComment e
  // EvaluationTemplateAssignment(employeeId) são onDelete:Cascade a partir de
  // Employee — apagam-se sozinhos ao apagar o colaborador a seguir.
  await prisma.employee.deleteMany({ where: nonPreservedEmployee });
  // UserRole, Task(assignee) e Message (sender/recipient) são
  // onDelete:Cascade a partir de User.
  await prisma.user.deleteMany({ where: { id: nonPreservedUser } });

  // Modelos de avaliação que já não têm nenhuma instância (todas eram de
  // colaboradores não preservados) ficam órfãos — removem-se a seguir
  // (cascata apaga secções/perguntas/opções/regras/atribuições).
  await prisma.evaluationTemplate.deleteMany({ where: { evaluations: { none: {} } } });

  // -------------------------------------------------------------------------
  // Fase 3 — apagar e recriar Departamentos/Locais/Equipas (como confirmado)
  // -------------------------------------------------------------------------
  console.log("Fase 3/9 — a apagar e recriar Departamentos/Locais/Equipas...");

  // Desliga-se (não se apaga) tudo o que só referencia o departamento/local
  // por metadados opcionais — nenhum destes é dado do Excel.
  await prisma.equipment.updateMany({ data: { departmentId: null } });
  await prisma.demandForecast.updateMany({ data: { departmentId: null, locationId: null } });
  await prisma.scheduleCycle.updateMany({ data: { departmentId: null } });

  // Ciclos "ao vivo" (não-modelo) que ainda têm alguma associação de um
  // colaborador preservado ficam de fora da limpeza — para não perder a
  // associação de horário de quem é para manter.
  const preservedCycleIds =
    preservedEmployeeIds.length > 0
      ? (
          await prisma.scheduleCycleAssignment.findMany({
            where: { employeeId: { in: preservedEmployeeIds } },
            select: { cycleId: true },
            distinct: ["cycleId"],
          })
        ).map((a) => a.cycleId)
      : [];
  await prisma.scheduleCycle.deleteMany({
    where: { isTemplate: false, id: { notIn: preservedCycleIds } },
  });

  // Nota: se um modelo de avaliação ainda em uso por um colaborador
  // preservado tiver uma atribuição por equipa (em vez de por colaborador),
  // essa atribuição cai em cascata aqui junto com a equipa antiga — a
  // avaliação em si não é afetada, só deixa de haver atribuição automática
  // "a toda a equipa X" para esse modelo. Não há dados do Excel para uma
  // equipa antiga que já não existe, por isso não há como recriá-la.
  await prisma.team.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.location.deleteMany({});

  const departmentByName = new Map<string, string>();
  for (const d of dataset.departamentos) {
    const rec = await prisma.department.create({ data: { name: d.nome } });
    departmentByName.set(d.nome, rec.id);
  }

  const locationByName = new Map<string, string>();
  for (const l of dataset.locais) {
    const rec = await prisma.location.create({
      data: {
        name: l.nome,
        address: l.address,
        postalCode: l.postalCode,
        municipality: l.municipality,
        district: l.district,
      },
    });
    locationByName.set(l.nome, rec.id);
  }

  const teamByName = new Map<string, string>();
  for (const t of dataset.equipas) {
    const departmentId = departmentByName.get(t.departamento);
    if (!departmentId) throw new Error(`Equipa "${t.nome}": departamento "${t.departamento}" não encontrado.`);
    const rec = await prisma.team.create({ data: { name: t.nome, departmentId } });
    teamByName.set(t.nome, rec.id);
  }

  console.log(
    `  ${departmentByName.size} departamentos, ${locationByName.size} locais, ${teamByName.size} equipas criados.`
  );

  // Reatribui os preservados ao novo local de referência.
  const preservedDeptId = departmentByName.get(PRESERVED_DEFAULT_DEPARTMENT);
  const preservedLocId = locationByName.get(PRESERVED_DEFAULT_LOCATION);
  const preservedTeamId = teamByName.get(PRESERVED_DEFAULT_TEAM);
  if (preservedEmployeeIds.length > 0) {
    await prisma.employee.updateMany({
      where: { id: { in: preservedEmployeeIds } },
      data: { departmentId: preservedDeptId, teamId: preservedTeamId, locationId: preservedLocId },
    });
    console.log(
      `  Colaboradores preservados reatribuídos a ${PRESERVED_DEFAULT_DEPARTMENT} / ${PRESERVED_DEFAULT_LOCATION} / ${PRESERVED_DEFAULT_TEAM}.`
    );
  }

  // -------------------------------------------------------------------------
  // Fase 4 — catálogos partilhados (upsert — nunca apagados)
  // -------------------------------------------------------------------------
  console.log("Fase 4/9 — a garantir catálogos partilhados (perfis de contrato, modelos de turno, tipos de ausência)...");

  const contractProfileByName = new Map<string, string>();
  for (const p of dataset.perfis_contrato) {
    const rec = await prisma.contractProfile.upsert({
      where: { name: p.nome },
      update: {},
      create: {
        name: p.nome,
        contractType: p.contractType,
        weeklyHours: p.weeklyHours,
        weeklyRestDays: p.weeklyRestDays,
        worksWeekends: p.worksWeekends === "Sim",
        worksHolidays: p.worksHolidays === "Sim",
      },
    });
    contractProfileByName.set(p.nome, rec.id);
  }

  const shiftTemplateByName = new Map<string, string>();
  for (const t of dataset.modelos_turno) {
    const rec = await prisma.shiftTemplate.upsert({
      where: { name: t.name },
      update: {},
      create: { name: t.name, startTime: t.startTime, endTime: t.endTime, breakMins: t.breakMins, color: t.color },
    });
    shiftTemplateByName.set(t.name, rec.id);
  }

  const absenceTypeByName = new Map<string, string>();
  for (const t of dataset.tipos_ausencia) {
    const rec = await prisma.absenceType.upsert({
      where: { name: t.name },
      update: {},
      create: {
        name: t.name,
        unitType: t.unitType,
        annualLimitDays: t.annualLimitDays,
        requiresDocument: t.requiresDocument,
        salaryImpactPercent: t.salaryImpactPercent,
        affectsBalance: t.affectsBalance,
      },
    });
    absenceTypeByName.set(t.name, rec.id);
  }
  const feriasType = await prisma.absenceType.findUnique({ where: { name: "Férias" } });
  if (!feriasType) {
    throw new Error('Tipo de ausência "Férias" não existe na base de dados — corra primeiro "npm run db:seed".');
  }
  absenceTypeByName.set("Férias", feriasType.id);

  console.log(
    `  ${contractProfileByName.size} perfis de contrato, ${shiftTemplateByName.size} modelos de turno, ${absenceTypeByName.size} tipos de ausência garantidos.`
  );

  // -------------------------------------------------------------------------
  // Fase 5 — criar os 500 colaboradores + utilizadores + perfis de acesso
  // -------------------------------------------------------------------------
  console.log("Fase 5/9 — a criar colaboradores e contas de acesso...");

  const perfilByEmployeeNumber = new Map(dataset.perfis_acessos.map((p) => [p.employeeNumber, p]));

  const employeeIdByNumber = new Map<string, string>();
  const userIdByNumber = new Map<string, string>();

  let created = 0;
  for (const c of dataset.colaboradores) {
    const perfil = perfilByEmployeeNumber.get(c.employeeNumber);
    if (!perfil) throw new Error(`Colaborador ${c.employeeNumber}: sem linha correspondente em "Perfis e Acessos".`);

    const departmentId = departmentByName.get(c.department);
    const locationId = locationByName.get(c.location);
    const teamId = teamByName.get(c.team);
    if (!departmentId || !locationId || !teamId) {
      throw new Error(`Colaborador ${c.employeeNumber}: departamento/local/equipa "${c.department}/${c.location}/${c.team}" não resolvido.`);
    }

    const passwordHash = await bcrypt.hash(perfil.senha_inicial, 12);
    const roleDepartmentId = perfil.departamento_gestor ? departmentByName.get(perfil.departamento_gestor) ?? null : null;

    const user = await prisma.user.create({
      data: {
        email: c.email,
        name: `${c.firstName} ${c.lastName}`,
        passwordHash,
        mustChangePassword: perfil.mustChangePassword === "Sim",
        roles: { create: [{ role: perfil.perfis, departmentId: roleDepartmentId }] },
        employee: {
          create: {
            employeeNumber: c.employeeNumber,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            nif: c.nif,
            phone: c.phone,
            birthDate: dateOnly(c.birthDate),
            jobTitle: c.jobTitle,
            departmentId,
            teamId,
            locationId,
            employmentType: c.employmentType,
            weeklyHours: c.weeklyHours,
            hireDate: dateOnly(c.hireDate),
            status: "ACTIVE",
            maritalStatus: c.maritalStatus,
            dependents: c.dependents,
            fiscalRegion: c.fiscalRegion,
            mealAllowanceOverride: c.mealAllowanceOverride,
          },
        },
      },
      include: { employee: true },
    });

    employeeIdByNumber.set(c.employeeNumber, user.employee!.id);
    userIdByNumber.set(c.employeeNumber, user.id);
    created++;
    if (created % 100 === 0) console.log(`  ${created}/${dataset.colaboradores.length} colaboradores criados...`);
  }
  console.log(`  ${created} colaboradores criados.`);

  // -------------------------------------------------------------------------
  // Fase 6 — contratos, ciclos de horário e atribuições
  // -------------------------------------------------------------------------
  console.log("Fase 6/9 — a criar contratos e ciclos de horário...");

  const contractRows = dataset.contratos_atribuidos.map((c) => {
    const employeeId = employeeIdByNumber.get(c.employeeNumber);
    const contractProfileId = contractProfileByName.get(c.perfil_contrato);
    if (!employeeId || !contractProfileId) {
      throw new Error(`Contrato de ${c.employeeNumber}: colaborador ou perfil "${c.perfil_contrato}" não resolvido.`);
    }
    return {
      employeeId,
      contractProfileId,
      startDate: dateOnly(c.startDate),
      baseSalary: c.baseSalary,
      trialPeriodEndDate: emptyToNull(c.trialPeriodEndDate) ? dateOnly(c.trialPeriodEndDate as string) : null,
      status: "ACTIVE" as const,
    };
  });
  await createManyChunked("Contratos", contractRows, (batch) => prisma.employeeContract.createMany({ data: batch }));

  // Agrupa as linhas (ciclo, weekIndex, dayOfWeek) do JSON por nome de ciclo
  // para reconstruir o padrão de cada um.
  const cyclesByName = new Map<string, { semanas: number; cells: Dataset["ciclos_horario"] }>();
  for (const row of dataset.ciclos_horario) {
    const entry = cyclesByName.get(row.ciclo) ?? { semanas: row.semanas, cells: [] };
    entry.cells.push(row);
    cyclesByName.set(row.ciclo, entry);
  }

  const cycleIdByName = new Map<string, string>();
  // Data de referência da semana 1 — não é um dado do Excel (os ciclos aí só
  // definem o padrão semanal), usa-se uma segunda-feira de referência.
  const CYCLE_REFERENCE_MONDAY = dateOnly("2026-01-05");
  for (const [name, info] of cyclesByName) {
    const cycle = await prisma.scheduleCycle.create({
      data: { name, weeks: info.semanas, startDate: CYCLE_REFERENCE_MONDAY, isTemplate: false },
    });
    cycleIdByName.set(name, cycle.id);
    const patternRows = info.cells.map((cell) => ({
      cycleId: cycle.id,
      weekIndex: cell.weekIndex,
      dayOfWeek: cell.dayOfWeek,
      isDayOff: cell.turno_ou_folga === "Folga",
      shiftTemplateId: cell.turno_ou_folga === "Folga" ? null : shiftTemplateByName.get(cell.turno_ou_folga) ?? null,
    }));
    await prisma.scheduleCyclePattern.createMany({ data: patternRows });
  }
  console.log(`  ${cycleIdByName.size} ciclos de horário criados.`);

  const assignmentRows = dataset.atribuicao_ciclos.map((a) => {
    const employeeId = employeeIdByNumber.get(a.employeeNumber);
    const cycleId = cycleIdByName.get(a.ciclo);
    if (!employeeId || !cycleId) {
      throw new Error(`Atribuição de ciclo de ${a.employeeNumber}: colaborador ou ciclo "${a.ciclo}" não resolvido.`);
    }
    return { employeeId, cycleId, offsetWeeks: a.offsetWeeks };
  });
  await createManyChunked("Atribuições de ciclo", assignmentRows, (batch) =>
    prisma.scheduleCycleAssignment.createMany({ data: batch })
  );

  // -------------------------------------------------------------------------
  // Fase 7 — saldos de férias, dias de férias aprovados e ausências
  // históricas
  // -------------------------------------------------------------------------
  console.log("Fase 7/9 — a criar saldos de férias, dias de férias e ausências históricas...");

  const vacationDaysCountByEmployeeNumber = new Map<string, number>();
  for (const f of dataset.ferias_dias_aprovados_2026) {
    vacationDaysCountByEmployeeNumber.set(
      f.employeeNumber,
      (vacationDaysCountByEmployeeNumber.get(f.employeeNumber) ?? 0) + 1
    );
  }
  const balanceRows = dataset.saldo_ferias.map((b) => {
    const employeeId = employeeIdByNumber.get(b.employeeNumber);
    if (!employeeId) throw new Error(`Saldo de férias de ${b.employeeNumber}: colaborador não resolvido.`);
    return {
      employeeId,
      absenceTypeId: feriasType.id,
      year: b.year,
      entitledDays: b.entitledDays,
      carryOverDays: b.carryOverDays,
      // O ano de 2026 já tem os 22 dias aprovados abaixo — o de 2025 (se
      // existir) é só o saldo de referência do ano anterior, sem registo de
      // uso explícito neste dataset.
      usedDays: b.year === 2026 ? vacationDaysCountByEmployeeNumber.get(b.employeeNumber) ?? 0 : 0,
    };
  });
  await createManyChunked("Saldos de férias", balanceRows, (batch) => prisma.absenceBalance.createMany({ data: batch }));

  // Uma linha do JSON = um dia de férias já aprovado — mesma representação
  // que a aplicação usa (ver toggleOneVacationDay em ferias/actions.ts: uma
  // Absence de startDate=endDate=dia, days=1).
  const vacationRows = dataset.ferias_dias_aprovados_2026.map((f) => {
    const employeeId = employeeIdByNumber.get(f.employeeNumber);
    const requestedById = userIdByNumber.get(f.employeeNumber);
    if (!employeeId || !requestedById) throw new Error(`Dia de férias de ${f.employeeNumber}: colaborador não resolvido.`);
    const date = dateOnly(f.date);
    return {
      employeeId,
      absenceTypeId: feriasType.id,
      startDate: date,
      endDate: date,
      days: 1,
      status: f.status,
      requestedById,
      approvedById: fallbackAdminUserId,
      decidedAt: date,
    };
  });
  await createManyChunked("Dias de férias 2026", vacationRows, (batch) => prisma.absence.createMany({ data: batch }));

  const historicalRows = dataset.ausencias_historicas.map((a) => {
    const employeeId = employeeIdByNumber.get(a.employeeNumber);
    const requestedById = userIdByNumber.get(a.employeeNumber);
    const absenceTypeId = absenceTypeByName.get(a.tipo_ausencia);
    if (!employeeId || !requestedById || !absenceTypeId) {
      throw new Error(`Ausência histórica de ${a.employeeNumber}: colaborador ou tipo "${a.tipo_ausencia}" não resolvido.`);
    }
    const endDate = dateOnly(a.endDate);
    return {
      employeeId,
      absenceTypeId,
      startDate: dateOnly(a.startDate),
      endDate,
      days: a.days,
      status: a.status,
      requestedById,
      approvedById: fallbackAdminUserId,
      decidedAt: endDate,
    };
  });
  await createManyChunked("Ausências históricas", historicalRows, (batch) => prisma.absence.createMany({ data: batch }));

  // -------------------------------------------------------------------------
  // Fase 8 — avaliações de desempenho (modelos, atribuições, instâncias)
  // -------------------------------------------------------------------------
  console.log("Fase 8/9 — a criar modelos de avaliação e instâncias...");

  const questionsByTemplate = new Map<string, Dataset["avaliacoes_modelos"]>();
  for (const q of dataset.avaliacoes_modelos) {
    const list = questionsByTemplate.get(q.template) ?? [];
    list.push(q);
    questionsByTemplate.set(q.template, list);
  }
  const consequencesByTemplate = new Map<string, Dataset["avaliacoes_consequencias"]>();
  for (const c of dataset.avaliacoes_consequencias) {
    const list = consequencesByTemplate.get(c.template) ?? [];
    list.push(c);
    consequencesByTemplate.set(c.template, list);
  }

  const templateIdByName = new Map<string, string>();
  for (const [name, questions] of questionsByTemplate) {
    const template = await prisma.evaluationTemplate.create({
      data: {
        name,
        hasSelfEvaluation: questions[0]?.hasSelfEvaluation === "Sim",
        createdById: fallbackAdminUserId,
        questions: {
          create: questions.map((q, i) => ({
            order: i,
            text: q.pergunta,
            type: q.tipo,
            maxScore: q.peso,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
          })),
        },
        consequenceRules: {
          create: (consequencesByTemplate.get(name) ?? []).map((c) => ({
            minPercent: c.minPercent,
            consequence: c.consequencia,
          })),
        },
      },
    });
    templateIdByName.set(name, template.id);
  }
  console.log(`  ${templateIdByName.size} modelos de avaliação criados.`);

  const evalAssignmentRows = dataset.avaliacoes_atribuicoes.map((a) => {
    const employeeId = employeeIdByNumber.get(a.employeeNumber);
    const templateId = templateIdByName.get(a.template);
    if (!employeeId || !templateId) {
      throw new Error(`Atribuição de avaliação de ${a.employeeNumber}: colaborador ou modelo "${a.template}" não resolvido.`);
    }
    return { employeeId, templateId };
  });
  await createManyChunked("Atribuições de avaliação", evalAssignmentRows, (batch) =>
    prisma.evaluationTemplateAssignment.createMany({ data: batch })
  );

  const evaluationRows = dataset.avaliacoes_instancias.map((e) => {
    const employeeId = employeeIdByNumber.get(e.employeeNumber);
    const templateId = templateIdByName.get(e.template);
    if (!employeeId || !templateId) {
      throw new Error(`Instância de avaliação de ${e.employeeNumber}: colaborador ou modelo "${e.template}" não resolvido.`);
    }
    const completed = e.status === "COMPLETED";
    return {
      employeeId,
      templateId,
      scheduledDate: dateOnly(e.scheduledDate),
      status: e.status,
      createdById: fallbackAdminUserId,
      managerCompletedAt: completed ? dateOnly(e.scheduledDate) : null,
      managerCompletedById: completed ? fallbackAdminUserId : null,
      managerScore: emptyToNull(e.managerScore),
      managerPercent: emptyToNull(e.managerPercent),
      managerConsequence: emptyToNull(e.managerConsequence),
    };
  });
  await createManyChunked("Instâncias de avaliação", evaluationRows, (batch) => prisma.evaluation.createMany({ data: batch }));

  // -------------------------------------------------------------------------
  // Fase 9 — componentes variáveis de payroll
  // -------------------------------------------------------------------------
  console.log("Fase 9/9 — a criar componentes variáveis de payroll...");

  const componentRows = dataset.payroll_componentes.map((p) => {
    const employeeId = employeeIdByNumber.get(p.employeeNumber);
    if (!employeeId) throw new Error(`Componente de payroll de ${p.employeeNumber}: colaborador não resolvido.`);
    return {
      employeeId,
      name: p.name,
      type: p.type,
      amount: p.amount,
      recurring: p.recurring === "Sim",
      applyYear: emptyToNull(p.applyYear),
      applyMonth: emptyToNull(p.applyMonth),
    };
  });
  await createManyChunked("Componentes de payroll", componentRows, (batch) => prisma.payrollComponent.createMany({ data: batch }));

  console.log("\n==================================================");
  console.log(" Reset e recarga concluídos com sucesso");
  console.log("==================================================");
  console.log(` ${created} colaboradores/utilizadores criados.`);
  console.log(` Preservados intactos: ${preservedUsers.map((u) => u.email).join(", ")}`);
  console.log(" Password inicial de cada colaborador novo: Troca-me#<employeeNumber> (mustChangePassword=true).");
  console.log(" Próximo passo sugerido: gerar os recibos de Payroll Jan-Set/2026 em lote, a partir da própria aplicação.");
  console.log("==================================================\n");
}

main()
  .catch((e) => {
    console.error("\nERRO — a operação pode ter ficado parcialmente aplicada.");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ---------------------------------------------------------------------------
// Nota sobre atomicidade: este script NÃO corre dentro de uma única
// transação de ponta a ponta (uma transação interativa desta dimensão,
// contra um pooler com connection_limit=1 como o do Supabase, arrisca
// esgotar o tempo de ligação a meio — já aconteceu noutras partes desta
// aplicação, ver comentários em horarios/ciclos/actions.ts). Em vez disso,
// cada fase escreve em lotes (createMany) ou sequencialmente, e a fase de
// apagar (Fase 2) apaga sempre "tudo o que não está preservado" — por isso,
// se o script falhar a meio, basta corrê-lo outra vez do zero: a fase de
// apagar limpa o que ficou a meio antes de recomeçar a criar.
// ---------------------------------------------------------------------------
