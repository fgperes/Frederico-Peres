import type { Employee } from "@prisma/client";
import { createContract } from "./actions";
import { ContractTypeSelect } from "./contract-type-select";

export function ContractForm({
  employees,
  contractTypes,
  defaultEmployeeId,
  parentContractId,
}: {
  employees: Employee[];
  contractTypes: { key: string; label: string }[];
  defaultEmployeeId?: string;
  parentContractId?: string;
}) {
  return (
    <form action={createContract} className="space-y-4">
      {parentContractId && <input type="hidden" name="parentContractId" value={parentContractId} />}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Colaborador</label>
        {/* Um <select> disabled nunca envia o seu valor no FormData —
            quando o colaborador já vem definido, fica só visual e o valor
            real segue num input hidden. */}
        <select
          name={defaultEmployeeId ? undefined : "employeeId"}
          required={!defaultEmployeeId}
          defaultValue={defaultEmployeeId}
          disabled={!!defaultEmployeeId}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-50"
        >
          <option value="">—</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
          ))}
        </select>
        {defaultEmployeeId && <input type="hidden" name="employeeId" value={defaultEmployeeId} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Tipo de contrato</label>
          <ContractTypeSelect contractTypes={contractTypes} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Horas semanais</label>
          <input name="weeklyHours" type="number" step="0.5" defaultValue={40} required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Folgas semanais (mín. legal: 1)</label>
          <input name="weeklyRestDays" type="number" step="1" min={1} max={7} defaultValue={2} required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Data de início</label>
          <input name="startDate" type="date" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Data de fim (se aplicável)</label>
          <input name="endDate" type="date" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Fim período experimental</label>
          <input name="trialPeriodEndDate" type="date" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Remuneração base (€)</label>
          <input name="baseSalary" type="number" step="0.01" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Documento contratual (nome do ficheiro)</label>
        <input name="documentName" placeholder="contrato_assinado.pdf" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Notas</label>
        <textarea name="notes" rows={2} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
      </div>

      <button type="submit" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
        Guardar
      </button>
    </form>
  );
}
