"use server";

import { auth } from "@/lib/auth";
import { VIEW_AS_COOKIE } from "@/lib/session";
import { ROLES } from "@/lib/roles";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Só o Administrador do Sistema (perfil real da sessão, nunca o do
// cookie) pode ativar a pré-visualização "ver como outro perfil".
async function assertRealSystemAdmin() {
  const session = await auth();
  if (!session?.user?.roles?.includes("ADMIN_SISTEMA")) {
    throw new Error("Apenas o Administrador do Sistema pode usar a pré-visualização de perfis.");
  }
}

export async function setViewAsRole(formData: FormData) {
  await assertRealSystemAdmin();
  const role = String(formData.get("role") ?? "");
  const cookieStore = await cookies();

  if (!role || !(ROLES as readonly string[]).includes(role)) {
    cookieStore.delete(VIEW_AS_COOKIE);
  } else {
    cookieStore.set(VIEW_AS_COOKIE, role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas
    });
  }

  revalidatePath("/", "layout");
}

export async function clearViewAsRole() {
  await assertRealSystemAdmin();
  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_COOKIE);
  revalidatePath("/", "layout");
}
