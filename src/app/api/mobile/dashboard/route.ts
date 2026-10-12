import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile/current-user";
import { loadColaboradorDashboardData } from "@/app/(app)/dashboard/colaborador-data";

export async function GET(req: Request) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const data = await loadColaboradorDashboardData(user);
  if (!data) {
    return NextResponse.json({ error: "Conta sem ficha de colaborador associada." }, { status: 404 });
  }

  return NextResponse.json(data);
}
