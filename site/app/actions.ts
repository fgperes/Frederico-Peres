"use server";

/**
 * Pedidos vindos dos formulários do site (demonstração, informação, suporte).
 * Envia por email via a API da Resend (https://resend.com) — precisa de
 * RESEND_API_KEY configurada nas variáveis de ambiente da Vercel. Sem essa
 * chave, o pedido fica só registado no log do servidor (nunca chega a
 * ninguém) — ver nota no README.
 */

export type LeadFormState = { success?: boolean; error?: string };

export type LeadKind = "demo" | "info" | "support";

const LEAD_SUBJECT: Record<LeadKind, string> = {
  demo: "Pedido de demonstração",
  info: "Pedido de informação",
  support: "Pedido de suporte",
};

const CONTACT_TO = process.env.CONTACT_EMAIL_TO ?? "geral@people4people.pt";

export async function submitLeadForm(
  kind: LeadKind,
  _prev: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const employeeCount = String(formData.get("employeeCount") ?? "").trim();
  const situation = String(formData.get("situation") ?? "").trim();

  if (!companyName || !contactName || !email) {
    return { error: "Preencha pelo menos a empresa, o nome de contacto e o email." };
  }
  if (kind === "support" && !situation) {
    return { error: "Descreva a situação para a nossa equipa poder ajudar." };
  }

  const lines = [
    `Empresa: ${companyName}`,
    `Contacto: ${contactName}`,
    role ? `Função: ${role}` : null,
    phone ? `Telefone: ${phone}` : null,
    `Email: ${email}`,
    employeeCount ? `Número de colaboradores: ${employeeCount}` : null,
    situation ? `\nSituação:\n${situation}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      `RESEND_API_KEY não configurada — "${LEAD_SUBJECT[kind]}" ficou só no log, não foi enviado:`,
      lines
    );
    // Não mostramos este problema ao visitante (do lado dele o pedido
    // "funcionou") — mas sem a chave configurada, nenhum pedido chega
    // realmente à equipa. Ver README para configurar a Resend.
    return { success: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "people4people <site@people4people.pt>",
        to: [CONTACT_TO],
        reply_to: email,
        subject: `${LEAD_SUBJECT[kind]} — ${companyName}`,
        text: lines,
      }),
    });
    if (!res.ok) {
      console.error("Resend respondeu com erro:", res.status, await res.text());
      throw new Error(`Resend respondeu ${res.status}`);
    }
    return { success: true };
  } catch (e) {
    console.error(`Falha ao enviar "${LEAD_SUBJECT[kind]}":`, e);
    return { error: "Não foi possível enviar o pedido agora. Tente novamente ou escreva-nos para geral@people4people.pt." };
  }
}

export const submitDemoForm = submitLeadForm.bind(null, "demo");
export const submitInfoForm = submitLeadForm.bind(null, "info");
export const submitSupportForm = submitLeadForm.bind(null, "support");
