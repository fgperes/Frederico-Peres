// Fora de actions.ts porque um ficheiro "use server" só pode exportar
// funções async — esta constante é usada tanto pelas server actions
// (validação) como pelo componente cliente (rótulos das linhas).
export const OPERATING_HOURS_DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;
