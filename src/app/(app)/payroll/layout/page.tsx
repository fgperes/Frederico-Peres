import { requireUser } from "@/lib/session";
import { canWrite } from "@/lib/roles";
import { getPayslipLayoutSettings } from "@/lib/payroll";
import { PageHeader, Card, LinkButton } from "@/components/ui";
import { LayoutTemplate } from "lucide-react";
import { redirect } from "next/navigation";
import { updatePayslipLayoutSettings } from "../actions";

const SECTION_LABELS: Record<string, string> = {
  EARNINGS: "Vencimentos",
  DEDUCTIONS: "Descontos",
};

export default async function PayslipLayoutPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "payroll")) redirect("/payroll");

  const layout = await getPayslipLayoutSettings();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={LayoutTemplate}
        title="Layout do Recibo de Vencimento"
        description="Escolha que linhas aparecem no recibo (ecrã e PDF), com que texto e por que ordem."
        action={<LinkButton href="/payroll/pressupostos" variant="secondary">Pressupostos</LinkButton>}
      />

      <form action={updatePayslipLayoutSettings} className="space-y-6">
        <Card>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Título do documento</label>
              <input
                name="documentTitle"
                defaultValue={layout.documentTitle}
                required
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Nota de rodapé</label>
              <textarea
                name="footerNote"
                rows={3}
                defaultValue={layout.footerNote}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-stone-400">
                Aparece no fundo do PDF e da pré-visualização do recibo.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-stone-900">Linhas do recibo</h2>
          <p className="mb-4 text-xs text-stone-500">
            A ordem é dada pelo número &quot;Ordem&quot; (mais baixo aparece primeiro), independentemente da secção. Linhas
            desmarcadas nunca aparecem; Salário base, Segurança Social e IRS aparecem sempre que visíveis, mesmo a
            0 €. As restantes só aparecem quando têm valor.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
                <tr>
                  <th className="w-20 py-2">Ordem</th>
                  <th className="py-2">Secção</th>
                  <th className="py-2">Texto</th>
                  <th className="w-20 py-2">Visível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {layout.lineItems.map((item, i) => (
                  <tr key={item.key}>
                    <td className="py-2">
                      <input
                        name={`order_${item.key}`}
                        type="number"
                        defaultValue={i}
                        className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-2 text-xs text-stone-500">{SECTION_LABELS[item.section] ?? item.section}</td>
                    <td className="py-2">
                      <input
                        name={`label_${item.key}`}
                        defaultValue={item.label}
                        required
                        className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input name={`visible_${item.key}`} type="checkbox" defaultChecked={item.visible} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <button type="submit" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          Guardar layout
        </button>
      </form>
    </div>
  );
}
