import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile/current-user";

export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const [dbUser, employee] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarKey: true, avatarImage: true },
    }),
    user.employeeId
      ? prisma.employee.findUnique({
          where: { id: user.employeeId },
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        })
      : null,
  ]);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
    avatarKey: dbUser?.avatarKey ?? null,
    hasAvatarImage: Boolean(dbUser?.avatarImage),
    employee,
  });
}
