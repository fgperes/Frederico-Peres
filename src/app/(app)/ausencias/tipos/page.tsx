import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { createAbsenceType } from "../actions";
import { redirect } from "next/navigation";

export default async function TiposAusenciaPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "ausencias")) redirect("/ausencias");

  const types = await prisma.absenceType.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader
        title="Tipos de Ausência"
        description="Configuração de tipos de ausência e respetivas regras (AU-01)."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-0">
          {types.length === 0 ? (
            <div className="p-6"><EmptyState message="Sem tipos configurados." /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Remunerada</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Unidade</th>
                  <th className="px-4 py-3">Limite anual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      <Badge color={t.paid ? "green" : "slate"}>{t.paid ? "Sim" : "Não"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={t.requiresDocument ? "amber" : "slate"}>
                        {t.requiresDocument ? "Obrigatório" : "Não exige"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {t.unitType === "WORKING_DAYS" ? "Dias úteis" : "Dias corridos"}
                    </td>
                    <td className="px-4 py-3">{t.annualLimitDays ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Novo Tipo</h2>
          <form action={createAbsenceType} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nome</label>
              <input name="name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Unidade</label>
              <select name="unitType" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="WORKING_DAYS">Dias úteis</option>
                <option value="CALENDAR_DAYS">Dias corridos</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Limite anual (dias)</label>
              <input name="annualLimitDays" type="number" step="0.5" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="paid" defaultChecked /> Remunerada
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requiresDocument" /> Exige documento comprovativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="affectsBalance" defaultChecked /> Afeta saldo de dias
            </label>
            <button type="submit" className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Criar tipo
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
