import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/roles";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.some((r) => user.roles.includes(r))) {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}
