"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import Link from "next/link";
import { DateField } from "@/components/date-field";
import { EmployeeTreeFilter, type TreeDepartment, type TreeTeam, type TreeEmployee } from "@/components/employee-tree-filter";

export type ReportDefinition = { key: string; label: string; usesRange: boolean };

// O <select> de relatório e o par de datas vivem no mesmo componente para o
// campo de datas aparecer/desaparecer assim que se escolhe outro tipo de
// relatório — sem ter de submeter o formulário primeiro. Isto evita que o
// primeiro "Gerar relatório" de um relatório com dimensão temporal corra
// sem o utilizador ter tido hipótese de escolher o período (o que puxaria
// sempre o intervalo por omissão da base de dados).
export function ReportFiltersForm({
  reportDefinitions,
  defaultReportKey,
  fromStr,
  toStr,
  departments,
  teams,
  employees,
  initialSelectedEmployees,
  exportHref,
}: {
  reportDefinitions: ReportDefinition[];
  defaultReportKey: string;
  fromStr: string;
  toStr: string;
  departments: TreeDepartment[];
  teams: TreeTeam[];
  employees: TreeEmployee[];
  initialSelectedEmployees: string[];
  exportHref: string;
}) {
  const [reportKey, setReportKey] = useState(defaultReportKey);
  const usesRange = reportDefinitions.find((r) => r.key === reportKey)?.usesRange ?? false;

  return (
    <form method="get" className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Relatório</label>
        <select
          name="report"
          value={reportKey}
          onChange={(e) => setReportKey(e.target.value)}
          className="w-full max-w-md rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        >
          {reportDefinitions.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {usesRange && (
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">De</label>
            <DateField
              name="from"
              defaultValue={fromStr}
              inputClassName="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Até</label>
            <DateField
              name="to"
              defaultValue={toStr}
              inputClassName="rounded-md border border-stone-300 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
          Departamento / Equipa / Colaborador
        </label>
        <EmployeeTreeFilter
          departments={departments}
          teams={teams}
          employees={employees}
          initialSelected={initialSelectedEmployees}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Gerar relatório
        </button>
        <Link
          href={exportHref}
          className="flex items-center gap-1.5 rounded-md border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <Download size={14} />
          Exportar XLSX
        </Link>
      </div>
      <p className="text-[11px] text-stone-400 dark:text-stone-600">
        Sem seleção mostra todos os colaboradores visíveis para o seu perfil.
      </p>
    </form>
  );
}
