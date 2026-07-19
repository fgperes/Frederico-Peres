// Traduz cada registo de auditoria (ação técnica + entidade) numa frase
// simples e direta em português, sem expor códigos internos ao utilizador.

type Color = "slate" | "green" | "red" | "amber" | "blue";

function withDetails(base: string, details: string | null): string {
  return details ? `${base} — ${details}` : base;
}

function translateClockDetails(details: string | null): string | null {
  if (!details) return details;
  return details
    .replace("CLOCK_IN", "Entrada")
    .replace("CLOCK_OUT", "Saída")
    .replace("BREAK_START", "Início de refeição")
    .replace("BREAK_END", "Fim de refeição");
}

type Describer = (details: string | null) => string;

const COMBOS: Record<string, Describer> = {
  "LOGIN:User": () => "Iniciou sessão na aplicação",
  "CHANGE_PASSWORD:User": () => "Alterou a password da própria conta",
  "RESET_PASSWORD:User": () => "Redefiniu a password de um utilizador",
  "UPDATE_AVATAR:User": () => "Alterou a foto de perfil",
  "CREATE:User": (d) => withDetails("Criou um novo utilizador", d),
  "UPDATE:User": (d) => withDetails("Atualizou um utilizador", d),
  "ACTIVATE:User": (d) => withDetails("Reativou um utilizador", d),
  "DEACTIVATE:User": (d) => withDetails("Desativou um utilizador", d),
  "UPDATE_ROLES:User": () => "Atualizou os perfis de acesso de um utilizador",

  "CREATE:Employee": (d) => withDetails("Criou uma nova ficha de colaborador", d),
  "UPDATE:Employee": (d) => withDetails("Atualizou os dados de um colaborador", d),
  "ACTIVATE:Employee": (d) => withDetails("Reativou um colaborador", d),
  "DEACTIVATE:Employee": (d) => withDetails("Inativou um colaborador", d),
  "IMPORT:Employee": () => "Importou colaboradores a partir de um ficheiro Excel",
  "REVERT_IMPORT:Employee": () => "Reverteu uma importação de colaboradores",

  "CREATE:Department": (d) => withDetails("Criou um novo departamento", d),
  "UPDATE:Department": (d) => withDetails("Editou um departamento", d),
  "DELETE:Department": (d) => withDetails("Apagou um departamento", d),
  "CREATE:Team": (d) => withDetails("Criou uma nova equipa", d),
  "UPDATE:Team": (d) => withDetails("Editou uma equipa", d),
  "DELETE:Team": (d) => withDetails("Apagou uma equipa", d),
  "CREATE:Location": (d) => withDetails("Criou um novo local de trabalho", d),
  "UPDATE:Location": (d) => withDetails("Editou um local de trabalho", d),
  "DELETE:Location": (d) => withDetails("Apagou um local de trabalho", d),
  "CREATE:EmployeeDocument": (d) => withDetails("Carregou um anexo na ficha de um colaborador", d),
  "DELETE:EmployeeDocument": () => "Removeu um anexo da ficha de um colaborador",

  "CREATE:Contract": () => "Criou um novo contrato",
  "UPDATE_STATUS:Contract": (d) => withDetails("Atualizou o estado de um contrato", d),

  "CLOCK:TimeClockEntry": (d) => withDetails("Registou uma picagem", translateClockDetails(d)),
  "JUSTIFY:TimeClockEntry": () => "Submeteu uma justificação de picagem",
  "APPROVE:TimeClockEntry": () => "Aprovou uma justificação de picagem",
  "REJECT:TimeClockEntry": () => "Rejeitou uma justificação de picagem",

  "CREATE:Absence": (d) => withDetails("Registou um pedido de ausência", d),
  "APPROVE:Absence": () => "Aprovou um pedido de ausência",
  "REJECT:Absence": () => "Rejeitou um pedido de ausência",
  "CANCEL:Absence": () => "Cancelou um pedido de ausência",
  "CREATE:AbsenceType": (d) => withDetails("Criou um novo tipo de ausência", d),

  "SEND_MESSAGE:Message": () => "Enviou uma mensagem rápida",

  "CREATE:Shift": () => "Criou um turno",
  "UPDATE:Shift": () => "Atualizou um turno",
  "DELETE:Shift": () => "Eliminou um turno",
  "PUBLISH:Shift": () => "Publicou os turnos de uma semana",
  "DUPLICATE:Shift": () => "Duplicou os turnos de uma semana",
  "GENERATE:Shift": () => "Gerou turnos automaticamente (horário preditivo)",
  "SEND_SCHEDULE:Shift": (d) => withDetails("Enviou a escala semanal aos colaboradores", d),
  "MEAL_ALERT:Shift": () => "Foi assinalada uma pausa de refeição em falta",

  "CREATE:ShiftTemplate": (d) => withDetails("Criou um modelo de turno", d),

  "CREATE:ScheduleCycle": (d) => withDetails("Criou um ciclo de horário", d),
  "ADD_WEEK:ScheduleCycle": () => "Adicionou uma semana a um ciclo de horário",
  "DUPLICATE_WEEK:ScheduleCycle": () => "Duplicou uma semana num ciclo de horário",
  "REMOVE_WEEK:ScheduleCycle": () => "Removeu uma semana de um ciclo de horário",
  "REORDER_WEEKS:ScheduleCycle": () => "Reordenou as semanas de um ciclo de horário",
  "SAVE_TEMPLATE:ScheduleCycle": (d) => withDetails("Guardou um ciclo como modelo reutilizável", d),
  "CREATE_FROM_TEMPLATE:ScheduleCycle": (d) => withDetails("Criou um ciclo a partir de um modelo", d),
  "UPDATE:ScheduleCyclePattern": () => "Atualizou o padrão de um ciclo de horário",
  "CREATE:ScheduleCycleAssignment": () => "Atribuiu um colaborador a um ciclo de horário",
  "DELETE:ScheduleCycleAssignment": () => "Removeu um colaborador de um ciclo de horário",

  "IMPORT:DemandForecast": () => "Importou uma previsão de procura",
  "REVERT_IMPORT:DemandForecast": () => "Reverteu uma importação de previsão de procura",

  "UPDATE:PayrollSettings": () => "Atualizou os pressupostos de payroll",
  "UPDATE:RolePermission": () => "Atualizou a matriz de acessos (perfis e módulos)",
  "UPDATE:IrsBracket": (d) => withDetails("Atualizou um escalão de IRS", d),
  "DELETE:IrsBracket": () => "Eliminou um escalão de IRS",
  "UPDATE:EmployeePayrollProfile": () => "Atualizou o perfil de payroll de um colaborador",
  "CREATE:PayrollComponent": (d) => withDetails("Adicionou uma componente de payroll", d),
  "DELETE:PayrollComponent": () => "Removeu uma componente de payroll",
  "GENERATE:Payslip": () => "Gerou um recibo de vencimento",

  "CREATE:Task": (d) => withDetails("Criou uma tarefa", d),
  "DONE:Task": () => "Concluiu uma tarefa",
};

const ACTION_COLOR: Record<string, Color> = {
  CREATE: "green",
  IMPORT: "green",
  PUBLISH: "green",
  GENERATE: "green",
  APPROVE: "green",
  ACTIVATE: "green",
  CREATE_FROM_TEMPLATE: "green",
  ADD_WEEK: "green",
  SAVE_TEMPLATE: "green",
  DONE: "green",
  UPDATE: "blue",
  UPDATE_STATUS: "blue",
  UPDATE_ROLES: "blue",
  UPDATE_AVATAR: "blue",
  DUPLICATE: "blue",
  DUPLICATE_WEEK: "blue",
  REORDER_WEEKS: "blue",
  SEND_MESSAGE: "blue",
  SEND_SCHEDULE: "blue",
  CLOCK: "blue",
  DELETE: "red",
  CANCEL: "red",
  REJECT: "red",
  DEACTIVATE: "red",
  REMOVE_WEEK: "red",
  REVERT_IMPORT: "red",
  JUSTIFY: "amber",
  RESET_PASSWORD: "amber",
  MEAL_ALERT: "amber",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "utilizador",
  Message: "mensagem",
  Department: "departamento",
  Team: "equipa",
  Location: "local de trabalho",
  Contract: "contrato",
  DemandForecast: "previsão de procura",
  ScheduleCycle: "ciclo de horário",
  ScheduleCyclePattern: "padrão de ciclo",
  ScheduleCycleAssignment: "atribuição de ciclo",
  Shift: "turno",
  ShiftTemplate: "modelo de turno",
  Employee: "colaborador",
  EmployeeDocument: "anexo de colaborador",
  TimeClockEntry: "picagem",
  Absence: "ausência",
  AbsenceType: "tipo de ausência",
  PayrollSettings: "pressupostos de payroll",
  IrsBracket: "escalão de IRS",
  EmployeePayrollProfile: "perfil de payroll",
  RolePermission: "matriz de acessos",
  PayrollComponent: "componente de payroll",
  Payslip: "recibo de vencimento",
  Task: "tarefa",
};

export function describeAuditLog(log: {
  action: string;
  entity: string;
  details?: string | null;
}): { sentence: string; label: string; color: Color } {
  const key = `${log.action}:${log.entity}`;
  const details = log.details ?? null;
  const describer = COMBOS[key];

  const entityLabel = ENTITY_LABELS[log.entity] ?? log.entity.toLowerCase();
  const color = ACTION_COLOR[log.action] ?? "slate";

  const sentence = describer
    ? describer(details)
    : withDetails(`Alterou um registo de ${entityLabel}`, details);

  return { sentence, label: entityLabel, color };
}
