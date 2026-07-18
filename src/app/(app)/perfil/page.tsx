import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/roles";
import { AvatarImage } from "@/lib/avatars";
import { AvatarPicker } from "./avatar-picker";
import { ChangePasswordForm } from "../alterar-password/change-password-form";
import { UserRound } from "lucide-react";

export default async function PerfilPage() {
  const user = await requireUser();
  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { name: true, email: true, avatarKey: true, avatarImage: true, mustChangePassword: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        icon={UserRound}
        title="O Meu Perfil"
        description="Informação da sua conta. Só pode alterar a sua própria foto e password, independentemente do perfil de acesso."
      />

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <AvatarImage
            avatarKey={dbUser.avatarKey}
            avatarImage={dbUser.avatarImage}
            name={dbUser.name}
            size={56}
          />
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{dbUser.name}</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">{dbUser.email}</p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {user.realRoles.map((r) => ROLE_LABELS[r]).join(", ")}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
          A minha foto de perfil
        </h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Carregue uma foto do seu computador ou escolha um avatar. A seleção fica associada só à sua conta.
        </p>
        <AvatarPicker
          name={dbUser.name}
          currentAvatarKey={dbUser.avatarKey}
          currentAvatarImage={dbUser.avatarImage}
        />
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
          Alterar password
        </h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Depois de guardar, terá de iniciar sessão novamente.
        </p>
        <ChangePasswordForm forced={dbUser.mustChangePassword} />
      </Card>
    </div>
  );
}
