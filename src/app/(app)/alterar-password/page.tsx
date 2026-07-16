import { requireUser } from "@/lib/session";
import { PageHeader, Card } from "@/components/ui";
import { ChangePasswordForm } from "./change-password-form";

export default async function AlterarPasswordPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Alterar Password" description="Segurança da conta." />
      <Card>
        <ChangePasswordForm forced={user.mustChangePassword} />
      </Card>
    </div>
  );
}
