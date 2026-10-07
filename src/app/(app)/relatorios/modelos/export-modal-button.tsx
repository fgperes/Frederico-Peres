"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Modal } from "@/components/modal";
import type { TreeDepartment, TreeTeam } from "@/components/employee-tree-filter";
import { TemplateExportForm } from "./template-export-form";

export function ExportModalButton({
  templateId,
  templateName,
  departments,
  teams,
  employees,
}: {
  templateId: string;
  templateName: string;
  departments: TreeDepartment[];
  teams: TreeTeam[];
  employees: { id: string; firstName: string; lastName: string; departmentId: string | null; teamId: string | null }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Exportar"
        className="text-stone-400 hover:text-violet-600 dark:hover:text-violet-400 dark:text-stone-500"
      >
        <FileDown size={14} />
      </button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title={`Exportar — ${templateName}`} widthClassName="max-w-2xl">
          <TemplateExportForm templateId={templateId} departments={departments} teams={teams} employees={employees} />
        </Modal>
      )}
    </>
  );
}
