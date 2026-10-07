import { requireUser } from "@/lib/session";
import { isSystemAdmin } from "@/lib/roles";
import { getHolidays } from "@/lib/holidays";
import { PageHeader, Card, Badge, Button, EmptyState } from "@/components/ui";
import { AcessosTabs } from "../tabs";
import { HolidayForm } from "./holiday-form";
import { HolidayImportForm } from "./import-form";
import { deleteHoliday } from "./actions";
import { redirect } from "next/navigation";
import { CalendarDays, Download } from "lucide-react";

export default async function FeriadosPage() {
  const user = await requireUser();
  if (!isSystemAdmin(user.roles)) redirect("/acessos");

  const holidays = await getHolidays();

  const byYear = new Map<number, typeof holidays>();
  for (const h of holidays) {
    const year = h.date.getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(h);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  return (
    <div>
      <PageHeader
        icon={CalendarDays}
        title="Perfis e Acessos"
        description="Configuração dos feriados nacionais e regionais usados na aplicação."
      />

      <AcessosTabs showDocumentos showFeriados />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {years.length === 0 ? (
            <Card>
              <EmptyState icon={CalendarDays} message="Sem feriados configurados." />
            </Card>
          ) : (
            years.map((year) => (
              <Card key={year} className="p-0">
                <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-800">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Feriados {year}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 dark:border-stone-800">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Âmbito</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {byYear.get(year)!.map((h) => (
                        <tr key={h.id}>
                          <td className="px-4 py-3">{h.date.toLocaleDateString("pt-PT")}</td>
                          <td className="px-4 py-3 font-medium">{h.description}</td>
                          <td className="px-4 py-3">
                            <Badge color={h.scope === "NATIONAL" ? "slate" : "blue"}>
                              {h.scope === "NATIONAL" ? "Nacional" : "Regional"}
                            </Badge>
                            {h.scope === "REGIONAL" && h.municipalities.length > 0 && (
                              <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">{h.municipalities.join(", ")}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <form action={deleteHoliday.bind(null, h.id)}>
                              <Button variant="danger" type="submit" className="px-2.5 py-1 text-xs">
                                Remover
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Novo Feriado</h2>
            <HolidayForm />
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Importar por Excel</h2>
              <a
                href="/api/templates/feriados"
                className="flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline"
              >
                <Download size={12} /> Descarregar template
              </a>
            </div>
            <p className="mb-3 text-xs text-stone-500 dark:text-stone-400">
              A coluna <code>municipalities</code> aceita vários concelhos separados por vírgula (só para
              feriados REGIONAL) — a folha &quot;Concelhos&quot; do template lista os nomes válidos por distrito.
            </p>
            <HolidayImportForm />
          </Card>
        </div>
      </div>
    </div>
  );
}
