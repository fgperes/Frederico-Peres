import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, isSystemAdmin, ROLE_LABELS } from "@/lib/roles";
import { PageHeader, Card, Badge } from "@/components/ui";
import { CreateUserForm } from "./create-user-form";
import { UserRolesForm } from "./user-roles-form";
import { ToggleActiveButton } from "./toggle-active-button";
import { AcessosTabs } from "./tabs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

export default async function AcessosPage() {
  const user = await requireUser();
  if (!canRead(user.roles, "acessos")) redirect("/dashboard");

  const admin = isSystemAdmin(user.roles);

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      include: { roles: { include: { department: true } }, employee: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Perfis e Acessos"
        description={
          admin
            ? "Gestão de utilizadores e perfis de acesso (RBAC)."
            : "Consulta de utilizadores e perfis de acesso (RBAC) — só de leitura."
        }
      />

      <AcessosTabs />

      <div className="space-y-6">
        <Card className="p-0">
          <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-800">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Utilizadores
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <tr>
                <th className="px-6 py-3">Utilizador</th>
                <th className="px-6 py-3">Perfis</th>
                <th className="px-6 py-3">Estado</th>
                {admin && <th className="px-6 py-3">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 align-top">
                    <div className="font-medium text-stone-900 dark:text-stone-100">{u.name}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">{u.email}</div>
                    {u.employee && (
                      <Link
                        href={`/colaboradores/${u.employee.id}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-400"
                      >
                        Gerir em Colaboradores
                        <ArrowUpRight size={11} />
                      </Link>
                    )}
                  </td>
                  <td className="px-6 py-3 align-top">
                    {admin && !u.employee ? (
                      <UserRolesForm
                        userId={u.id}
                        currentRoles={u.roles.map((r) => r.role)}
                        currentDepartmentId={
                          u.roles.find((r) => r.role === "GESTOR_EQUIPA")
                            ?.departmentId ?? null
                        }
                        departments={departments}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-xs text-stone-500 dark:text-stone-400">—</span>
                        ) : (
                          u.roles.map((r) => (
                            <Badge key={r.id} color="blue">
                              {ROLE_LABELS[r.role]}
                              {r.department ? ` · ${r.department.name}` : ""}
                            </Badge>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 align-top">
                    <Badge color={u.active ? "green" : "red"}>
                      {u.active ? "Ativo" : "Desativado"}
                    </Badge>
                  </td>
                  {admin && (
                    <td className="px-6 py-3 align-top">
                      <ToggleActiveButton userId={u.id} active={u.active} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {admin && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
              Novo Utilizador
            </h3>
            <CreateUserForm />
          </Card>
        )}
      </div>
    </div>
  );
}
