import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Lista todos os utilizadores (sem passwords — essas nunca são
// recuperáveis, só redefinidas via reset-admin-password.ts).
async function main() {
  const users = await prisma.user.findMany({
    include: { roles: true },
    orderBy: { name: "asc" },
  });

  const rows = users.map((u) => ({
    Nome: u.name,
    Email: u.email,
    Perfis: u.roles.map((r) => r.role).join(", "),
    Ativo: u.active ? "sim" : "não",
    "1º login pendente": u.mustChangePassword ? "sim" : "não",
  }));

  console.table(rows);
  console.log(`\nTotal: ${users.length} utilizador(es).`);
  console.log(
    "\nPara obter uma password nova para um utilizador específico:\n" +
      "  npm run db:reset-admin-password -- <email>\n"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
