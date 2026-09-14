import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { PicagensTabs } from "../tabs";
import { CreateEquipmentForm } from "./create-equipment-form";
import { EquipmentRowActions } from "./equipment-row-actions";
import { WebhookUrl } from "./webhook-url";
import { Fingerprint } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  BIOMETRIC: "Terminal biométrico",
  RFID: "Cartão / RFID",
  PIN: "PIN",
  MOBILE: "Aplicação móvel",
  OTHER: "Outro",
};

export default async function TerminaisPage() {
  const user = await requireUser();
  if (!canWrite(user.roles, "picagens")) redirect("/picagens");

  const [equipment, departments, hdrs] = await Promise.all([
    prisma.equipment.findMany({ include: { department: true }, orderBy: { createdAt: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    headers(),
  ]);

  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const baseUrl = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? "");

  return (
    <div>
      <PageHeader
        icon={Fingerprint}
        title="Picagens"
        description="Configuração de terminais e equipamentos de picagem."
      />
      <PicagensTabs showTerminais />

      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Como integrar um terminal físico
        </h2>
        <p className="mb-4 text-xs text-stone-500 dark:text-stone-400">
          Cada equipamento tem um URL de webhook único. Configure-o no terminal ou no serviço
          cloud do fabricante para que envie um pedido <code>POST</code> a cada picagem, com o
          corpo JSON <code>{"{ employeeExternalId, type, timestamp }"}</code> (
          <code>type</code>: <code>CLOCK_IN</code>/<code>CLOCK_OUT</code>/<code>BREAK_START</code>/
          <code>BREAK_END</code>; <code>employeeExternalId</code> é o número mecanográfico do
          colaborador). Para terminais que só expõem uma API própria (sem suporte a webhooks),
          guarde aqui o endpoint do fabricante como referência — a sincronização por consulta
          periódica a essa API é feita caso a caso, consoante o protocolo de cada fabricante.
        </p>

        {equipment.length === 0 ? (
          <EmptyState message="Sem equipamentos configurados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Localização</th>
                  <th className="px-3 py-2">Webhook</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {equipment.map((eq) => (
                  <tr key={eq.id}>
                    <td className="px-3 py-2.5 align-top font-medium text-stone-900 dark:text-stone-100">
                      {eq.name}
                    </td>
                    <td className="px-3 py-2.5 align-top">{TYPE_LABELS[eq.type] ?? eq.type}</td>
                    <td className="px-3 py-2.5 align-top">{eq.department?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 align-top">
                      <WebhookUrl url={`${baseUrl}/api/picagens/webhook/${eq.webhookToken}`} />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <Badge color={eq.active ? "green" : "slate"}>{eq.active ? "Ativo" : "Inativo"}</Badge>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <EquipmentRowActions equipmentId={eq.id} equipmentName={eq.name} active={eq.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Novo Equipamento
        </h2>
        <CreateEquipmentForm departments={departments} />
      </Card>
    </div>
  );
}
