import type { Employee } from "@prisma/client";
import { createContract } from "./actions";

const CONTRACT_TYPES = [
  { value: "SEM_TERMO", label: "Sem termo" },
  { value: "TERMO_CERTO", label: "Termo certo" },
  { value: "TERMO_INCERTO", label: "Termo incerto" },
  { value: "PRESTACAO_SERVICOS", label: "Prestação de serviços" },
  { value: "PART_TIME", label: "Part-time" },
];

export function ContractForm({
  employees,
  defaultEmployeeId,
  parentContractId,
}: {
  employees: Employee[];
  defaultEmployeeId?: string;
  parentContractId?: string;
}) {
  return (
    <form action={createContract} className="space-y-4">
      {parentContractId && <input type="hidden" name="parentContractId" value={parentContractId} />}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Colaborador</label>
        <select
          name="employeeId"
          required
          defaultValue={defaultEmployeeId}
          disabled={!!defaultEmployeeId}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        >
          <option value="">—</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de contrato</label>
          <select name="contractType" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {CONTRACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Horas semanais</label>
          <input name="weeklyHours" type="number" step="0.5" defaultValue={40} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Data de início</label>
          <input name="startDate" type="date" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Data de fim (se aplicável)</label>
          <input name="endDate" type="date" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Fim período experimental</label>
          <input name="trialPeriodEndDate" type="date" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Remuneração base (€)</label>
          <input name="baseSalary" type="number" step="0.01" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Documento contratual (nome do ficheiro)</label>
        <input name="documentName" placeholder="contrato_assinado.pdf" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Notas</label>
        <textarea name="notes" rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Guardar
      </button>
    </form>
  );
}
