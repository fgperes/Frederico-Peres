import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canWrite } from "@/lib/roles";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { renameContractProfile, setContractProfileActive, endEmployeeContract } from "../actions";
import { notFound } from "next/navigation";
import { FileSignature, User } from "lucide-react";
import { getContractTypeLabels } from "@/lib/contract-types";
import Link from "next/link";

export default async function ContractProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const canEdit = canWrite(user.roles, "contratos");

  const profile = await prisma.contractProfile.findUnique({ where: { id } });
  if (!profile) notFound();

  const [assignments, contractTypeLabels] = await Promise.all([
    prisma.employeeContract.findMany({
      where: { contractProfileId: id },
      include: { employee: true },
      orderBy: { startDate: "desc" },
    }),
    getContractTypeLabels(),
  ]);

  const current = assignments.filter((a) => a.status === "ACTIVE");
  const history = assignments.filter((a) => a.status !== "ACTIVE");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={FileSignature}
        title={profile.name}
        description={`${contractTypeLabels[profile.contractType] ?? profile.contractType} · ${profile.weeklyHours}h/semana · ${profile.weeklyRestDays} folga(s)/semana`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={profile.active ? "green" : "slate"}>{profile.active ? "Ativo" : "Inativo"}</Badge>
            {canEdit && (
              <form action={setContractProfileActive.bind(null, profile.id, !profile.active)}>
                <Button variant={profile.active ? "danger" : "secondary"} type="submit">
                  {profile.active ? "Inativar" : "Reativar"}
                </Button>
              </form>
            )}
          </div>
        }
      />

      {canEdit && (
        <Card className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">Renomear</h2>
          <form action={renameContractProfile.bind(null, profile.id)} className="flex items-center gap-2">
            <input
              name="name"
              defaultValue={profile.name}
              required
              className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
            <button type="submit" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
              Guardar
            </button>
          </form>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            O tipo de contrato, as horas semanais e as folgas semanais não podem ser alterados depois de criado.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Colaboradores atualmente atribuídos
        </h2>
        {current.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Nenhum colaborador atribuído a este contrato.</p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {current.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <Link
                  href={`/colaboradores/${a.employeeId}`}
                  className="flex items-center gap-2 text-sm font-medium text-violet-700 hover:underline dark:text-violet-400"
                >
                  <User size={14} />
                  {a.employee.firstName} {a.employee.lastName}
                </Link>
                <span className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  desde {a.startDate.toLocaleDateString("pt-PT")}
                  {canEdit && (
                    <form action={endEmployeeContract.bind(null, a.id)}>
                      <Button variant="danger" type="submit" className="px-2.5 py-1 text-xs">
                        Rescindir
                      </Button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {history.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Histórico</h2>
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <Link
                  href={`/colaboradores/${a.employeeId}`}
                  className="text-sm text-stone-700 hover:underline dark:text-stone-300"
                >
                  {a.employee.firstName} {a.employee.lastName}
                </Link>
                <span className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  {a.startDate.toLocaleDateString("pt-PT")} — {a.endDate ? a.endDate.toLocaleDateString("pt-PT") : "—"}
                  <Badge color="slate">Encerrado</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
