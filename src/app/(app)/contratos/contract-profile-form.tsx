import { createContractProfile } from "./actions";
import { ContractTypeSelect } from "./contract-type-select";

export function ContractProfileForm({
  contractTypes,
}: {
  contractTypes: { key: string; label: string }[];
}) {
  return (
    <form action={createContractProfile} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Nome do contrato</label>
        <input
          name="name"
          required
          placeholder="ex.: Full-time SEM_TERMO 40h"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      <p className="text-xs text-stone-500">
        Depois de criado, só o nome e o estado ativo/inativo podem ser alterados. Para atribuir este contrato a um
        colaborador, faça-o a partir da ficha do colaborador.
      </p>

      <button type="submit" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
        Guardar
      </button>
    </form>
  );
}
