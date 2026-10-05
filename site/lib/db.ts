import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

/**
 * Liga à mesma base de dados Supabase que a app SGRH usa (DATABASE_URL),
 * só para gravar os pedidos recebidos pelos formulários do site — ver
 * lib/leads.ts. Sem esta variável configurada, os pedidos continuam a ser
 * enviados por email, só não ficam registados na base de dados.
 */
export function getSql() {
  if (!process.env.DATABASE_URL) return null;
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  }
  return sql;
}
