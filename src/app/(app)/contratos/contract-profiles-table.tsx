import Link from "next/link";
import { Badge } from "@/components/ui";

export type ContractProfileRow = {
  id: string;
  name: string;
  contractTypeLabel: string;
  weeklyHours: number;
  weeklyRestDays: number;
  active: boolean;
  employeeCount: number;
};

// Cada linha é um perfil de contrato partilhado — o número de colaboradores
// é quantos têm este perfil atualmente atribuído (histórico completo fica
// na ficha do próprio contrato).
export function ContractProfilesTable({ profiles }: { profiles: ContractProfileRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Horas/semana</th>
            <th className="px-4 py-3">Folgas/semana</th>
            <th className="px-4 py-3">Colaboradores</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {profiles.map((p) => (
            <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/40">
              <td className="px-4 py-3">
                <Link href={`/contratos/${p.id}`} className="font-medium text-violet-700 hover:underline dark:text-violet-400">
                  {p.name}
                </Link>
              </td>
              <td className="px-4 py-3">{p.contractTypeLabel}</td>
              <td className="px-4 py-3">{p.weeklyHours}h</td>
              <td className="px-4 py-3">{p.weeklyRestDays}</td>
              <td className="px-4 py-3">{p.employeeCount}</td>
              <td className="px-4 py-3">
                <Badge color={p.active ? "green" : "slate"}>{p.active ? "Ativo" : "Inativo"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
