"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { AVATARS } from "@/lib/avatars";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_DATA_URL_LENGTH = 400_000; // ~300KB de imagem já redimensionada no browser

function refreshAvatarViews() {
  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

// Qualquer utilizador só pode alterar o seu próprio avatar — mesmo que
// esteja, por exemplo, a consultar a ficha de outro colaborador.
export async function updateAvatar(avatarKey: string) {
  const user = await requireUser();
  if (!AVATARS.some((a) => a.key === avatarKey)) {
    throw new Error("Avatar inválido.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { avatarKey, avatarImage: null } });
  await logAudit({ userId: user.id, action: "UPDATE_AVATAR", entity: "User", entityId: user.id });
  refreshAvatarViews();
}

// Foto carregada a partir do computador — o browser já a redimensiona e
// recomprime antes de enviar (ver lib/client-files.ts), para caber num
// campo de texto na base de dados sem precisar de armazenamento externo.
export async function uploadAvatarImage(dataUrl: string) {
  const user = await requireUser();
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Ficheiro inválido — escolha uma imagem.");
  }
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Imagem demasiado grande. Escolha uma foto mais pequena.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarImage: dataUrl, avatarKey: null },
  });
  await logAudit({
    userId: user.id,
    action: "UPDATE_AVATAR",
    entity: "User",
    entityId: user.id,
    details: "Foto carregada do computador",
  });
  refreshAvatarViews();
}

export async function removeAvatarImage() {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { avatarImage: null } });
  refreshAvatarViews();
}
