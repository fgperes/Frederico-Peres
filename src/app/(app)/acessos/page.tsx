import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, isSystemAdmin, ROLES, ROLE_LABELS } from "@/lib/roles";
import { PageHeader, Card, Badge } from "@/components/ui";
import { CreateUserForm } from "./create-user-form";
import { toggleUserActive, updateUserRoles } from "./actions";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default async function AcessosPage() {
  const user = await requireUser();
  if (!canRead(user.roles, "acessos")) redirect("/dashboard");

  const admin = isSystemAdmin(user.roles);

  const [users, departments, employees, auditLog] = await Promise.all([
    prisma.user.findMany({
      include: { roles: { include: { department: true } }, employee: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { user: null },
      orderBy: { firstName: "asc" },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Perfis e Acessos"
        description="Gestão de utilizadores, perfis de acesso (RBAC) e auditoria."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-0">
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-stone-900">
                Utilizadores
              </h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/60 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-6 py-3">Utilizador</th>
                  <th className="px-6 py-3">Perfis</th>
                  <th className="px-6 py-3">Estado</th>
                  {admin && <th className="px-6 py-3">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-3 align-top">
                      <div className="font-medium text-stone-900">{u.name}</div>
                      <div className="text-xs text-stone-500">{u.email}</div>
                    </td>
                    <td className="px-6 py-3 align-top">
                      {admin ? (
                        <form
                          action={updateUserRoles.bind(null, u.id)}
                          className="space-y-2"
                        >
                          <div className="grid grid-cols-1 gap-1">
                            {ROLES.map((role) => (
                              <label
                                key={role}
                                className="flex items-center gap-2 text-xs text-stone-700"
                              >
                                <input
                                  type="checkbox"
                                  name="roles"
                                  value={role}
                                  defaultChecked={u.roles.some(
                                    (r) => r.role === role
                                  )}
                                />
                                {ROLE_LABELS[role]}
                              </label>
                            ))}
                          </div>
                          <select
                            name="departmentId"
                            defaultValue={
                              u.roles.find((r) => r.role === "GESTOR_EQUIPA")
                                ?.departmentId ?? ""
                            }
                            className="w-full rounded-md border border-stone-300 px-2 py-1 text-xs"
                          >
                            <option value="">
                              Âmbito (departamento) p/ Gestor de Equipa
                            </option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-md bg-stone-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-900"
                          >
                            Guardar perfis
                          </button>
                        </form>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <Badge key={r.id} color="blue">
                              {ROLE_LABELS[r.role]}
                              {r.department ? ` · ${r.department.name}` : ""}
                            </Badge>
                          ))}
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
                        <form action={toggleUserActive.bind(null, u.id, !u.active)}>
                          <button
                            type="submit"
                            className="rounded-md border border-stone-300 px-2.5 py-1 text-xs hover:bg-stone-50"
                          >
                            {u.active ? "Desativar" : "Ativar"}
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {admin && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-stone-900">
                Novo Utilizador
              </h2>
              <CreateUserForm employees={employees} />
            </Card>
          )}
        </div>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-stone-900">
            Log de Auditoria
          </h2>
          <ul className="max-h-[32rem] space-y-3 overflow-y-auto text-xs">
            {auditLog.map((log) => (
              <li key={log.id} className="border-b border-stone-100 pb-2">
                <div className="font-medium text-stone-700">
                  {log.action} · {log.entity}
                </div>
                <div className="text-stone-500">{log.details}</div>
                <div className="text-stone-500">
                  {log.user?.name ?? "Sistema"} —{" "}
                  {log.createdAt.toLocaleString("pt-PT")}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
