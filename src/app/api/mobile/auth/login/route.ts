import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/mobile/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email e password são obrigatórios." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { employee: true } });
  if (!user || !user.active) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  if (!user.employee) {
    return NextResponse.json(
      { error: "Esta conta não está associada a um colaborador e não pode aceder à app mobile." },
      { status: 403 }
    );
  }

  await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN_MOBILE", entity: "User", entityId: user.id },
  });

  const token = await signMobileToken({ userId: user.id, employeeId: user.employee.id });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mustChangePassword: user.mustChangePassword,
    },
  });
}
