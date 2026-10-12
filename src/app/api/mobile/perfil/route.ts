import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser, MobileAuthError } from "@/lib/mobile/current-user";
import { ROLE_LABELS } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    const user = await requireMobileUser(req);

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, avatarKey: true, avatarImage: true, mustChangePassword: true },
    });

    return NextResponse.json({
      name: dbUser.name,
      email: dbUser.email,
      avatarKey: dbUser.avatarKey,
      avatarImage: dbUser.avatarImage,
      mustChangePassword: dbUser.mustChangePassword,
      roleLabels: user.realRoles.map((r) => ROLE_LABELS[r] ?? r),
    });
  } catch (e) {
    if (e instanceof MobileAuthError) return e.response;
    throw e;
  }
}
