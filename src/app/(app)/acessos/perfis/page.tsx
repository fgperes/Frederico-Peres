import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canRead, isSystemAdmin, getMatrixSnapshot, CONFIGURABLE_ROLES, ROLE_LABELS } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui";
import { PermissionsMatrix } from "../permissions-matrix";
import { RoleManager } from "./role-manager";
import { AcessosTabs } from "../tabs";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default async function AcessosPerfisPage() {
  const user = await requireUser();
  if (!canRead(user.roles, "acessos")) redirect("/dashboard");

  const admin = isSystemAdmin(user.roles);

  let roleDefs: { id: string; key: string; label: string; isSystem: boolean }[] = [];
  const roleUserCounts: Record<string, number> = {};
  if (admin) {
    const [defs, grouped] = await Promise.all([
      prisma.roleDefinition.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.userRole.groupBy({ by: ["role"], _count: true }),
    ]);
    roleDefs = defs;
    for (const g of grouped) roleUserCounts[g.role] = g._count;
  }

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

      <div className="space-y-8">
        {admin && (
          <Card>
            <h3 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
              Tipos de perfil
            </h3>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
              Crie novos tipos de perfil, renomeie os existentes ou elimine os que já não sejam
              necessários (só é possível eliminar perfis sem utilizadores atribuídos).
            </p>
            <RoleManager roleDefs={roleDefs} roleUserCounts={roleUserCounts} />
          </Card>
        )}

        <Card>
          <h3 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
            Módulos por perfil
          </h3>
          <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
            Para cada perfil, defina a que módulos tem acesso e se pode fazer edições ou apenas
            consultar.
          </p>
          <PermissionsMatrix
            matrix={getMatrixSnapshot()}
            canEdit={admin}
            configurableRoles={CONFIGURABLE_ROLES}
            roleLabels={ROLE_LABELS}
          />
        </Card>
      </div>
    </div>
  );
}
