import { requireUser } from "@/lib/session";
import { canRead, isSystemAdmin, getMatrixSnapshot } from "@/lib/roles";
import { PageHeader, Card } from "@/components/ui";
import { PermissionsMatrix } from "../permissions-matrix";
import { AcessosTabs } from "../tabs";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default async function AcessosPerfisPage() {
  const user = await requireUser();
  if (!canRead(user.roles, "acessos")) redirect("/dashboard");

  const admin = isSystemAdmin(user.roles);

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

      <Card>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Para cada perfil, defina a que módulos tem acesso e se pode fazer edições ou apenas
          consultar.
        </p>
        <PermissionsMatrix matrix={getMatrixSnapshot()} canEdit={admin} />
      </Card>
    </div>
  );
}
