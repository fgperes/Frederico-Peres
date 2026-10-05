import { getSql } from "./db";
import type { LeadKind } from "@/app/actions";

export type LeadRecord = {
  kind: LeadKind;
  companyName: string;
  contactName: string;
  role?: string;
  phone?: string;
  email: string;
  nipc?: string;
  employeeCount?: string;
  situation?: string;
  dataConsent?: boolean;
  marketingConsent?: boolean;
};

export async function saveLead(lead: LeadRecord) {
  const sql = getSql();
  if (!sql) {
    console.error("DATABASE_URL não configurada — pedido não foi gravado na base de dados.");
    return;
  }

  const isCommercial = lead.kind !== "support";

  try {
    await sql`
      insert into leads (
        type, source, company_name, contact_name, role, phone, email,
        nipc, employee_count, situation, data_consent, marketing_consent
      ) values (
        ${lead.kind === "support" ? "support" : "new_lead"},
        ${lead.kind},
        ${lead.companyName},
        ${lead.contactName},
        ${lead.role || null},
        ${lead.phone || null},
        ${lead.email},
        ${lead.nipc || null},
        ${lead.employeeCount || null},
        ${lead.situation || null},
        ${isCommercial ? (lead.dataConsent ?? false) : null},
        ${isCommercial ? (lead.marketingConsent ?? false) : null}
      )
    `;
  } catch (e) {
    console.error("Falha ao gravar o pedido na base de dados:", e);
  }
}
