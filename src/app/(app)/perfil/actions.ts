"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { AVATARS } from "@/lib/avatars";
import { revalidatePath } from "next/cache";

// Qualquer utilizador só pode alterar o seu próprio avatar — mesmo que
// esteja, por exemplo, a consultar a ficha de outro colaborador.
export async function updateAvatar(avatarKey: string) {
  const user = await requireUser();
  if (!AVATARS.some((a) => a.key === avatarKey)) {
    throw new Error("Avatar inválido.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { avatarKey } });
  await logAudit({ userId: user.id, action: "UPDATE_AVATAR", entity: "User", entityId: user.id });

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}
