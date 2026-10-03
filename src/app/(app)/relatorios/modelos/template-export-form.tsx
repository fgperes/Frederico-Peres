"use client";

import { useRef, useState, useTransition } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui";
import { EmployeeTreeFilter, type TreeDepartment, type TreeTeam, type TreeEmployee } from "@/components/employee-tree-filter";
import { MONTH_LABELS } from "@/lib/dates";
import { resolveDocumentTemplateExport, type ResolvedBlock } from "./actions";
import { buildAndDownloadDocumentPdf } from "./build-pdf";
import { buildAndDownloadDocumentExcel } from "./build-excel";

export function TemplateExportForm({
  templateId,
  departments,
  teams,
  employees,
}: {
  templateId: string;
  departments: TreeDepartment[];
  teams: TreeTeam[];
  employees: { id: string; firstName: string; lastName: string; departmentId: string | null; teamId: string | null }[];
}) {
  const now = new Date();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const employeeTreeItems: TreeEmployee[] = employees.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    departmentId: e.departmentId,
    teamId: e.teamId,
  }));

  function resolve(): Promise<{ templateName: string; blocks: ResolvedBlock[] } | null> {
    return new Promise((resolve) => {
      const formData = new FormData(formRef.current!);
      const month = Number(formData.get("month"));
      const year = Number(formData.get("year"));
      const employeeIds = String(formData.get("employees") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      setError(null);
      startTransition(async () => {
        const result = await resolveDocumentTemplateExport(templateId, { month, year, employeeIds });
        if ("error" in result) {
          setError(result.error);
          resolve(null);
          return;
        }
        if (result.blocks.length === 0) {
          setError("Este modelo ainda não tem blocos — adicione pelo menos um antes de gerar.");
          resolve(null);
          return;
        }
        resolve(result);
      });
    });
  }

  async function handlePdf() {
    const result = await resolve();
    if (result) await buildAndDownloadDocumentPdf(result.templateName, result.blocks);
  }

  async function handleExcel() {
    const result = await resolve();
    if (result) await buildAndDownloadDocumentExcel(result.templateName, result.blocks);
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Mês</label>
          <select
            name="month"
            defaultValue={now.getMonth() + 1}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
          >
            {MONTH_LABELS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Ano</label>
          <select
            name="year"
            defaultValue={now.getFullYear()}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">
            Colaboradores (vazio = todos no seu âmbito)
          </label>
          <EmployeeTreeFilter
            departments={departments}
            teams={teams}
            employees={employeeTreeItems}
            initialSelected={[]}
            fieldName="employees"
          />
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handlePdf} disabled={pending}>
          <FileDown size={15} />
          {pending ? "A gerar..." : "Gerar PDF"}
        </Button>
        <Button type="button" variant="secondary" onClick={handleExcel} disabled={pending}>
          <FileSpreadsheet size={15} />
          {pending ? "A gerar..." : "Gerar Excel"}
        </Button>
      </div>
    </form>
  );
}
