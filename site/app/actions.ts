"use server";

/**
 * Pedido de demonstração vindo do formulário de contacto. Envia por email
 * via a API da Resend (https://resend.com) — precisa de RESEND_API_KEY
 * configurada nas variáveis de ambiente da Vercel. Sem essa chave, o pedido
 * fica só registado no log do servidor (nunca chega a ninguém) — ver nota
 * no README.
 */

export type ContactFormState = { success?: boolean; error?: string };

const CONTACT_TO = process.env.CONTACT_EMAIL_TO ?? "geral@people4people.pt";

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!companyName || !contactName || !email) {
    return { error: "Preencha pelo menos a empresa, o nome de contacto e o email." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "RESEND_API_KEY não configurada — pedido de demonstração ficou só no log, não foi enviado:",
      { companyName, contactName, role, phone, email }
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
        subject: `Pedido de demonstração — ${companyName}`,
        text: [
          `Empresa: ${companyName}`,
          `Contacto: ${contactName}`,
          `Função: ${role || "—"}`,
          `Telefone: ${phone || "—"}`,
          `Email: ${email}`,
        ].join("\n"),
      }),
    });
    if (!res.ok) {
      console.error("Resend respondeu com erro:", res.status, await res.text());
      throw new Error(`Resend respondeu ${res.status}`);
    }
    return { success: true };
  } catch (e) {
    console.error("Falha ao enviar pedido de demonstração:", e);
    return { error: "Não foi possível enviar o pedido agora. Tente novamente ou escreva-nos para geral@people4people.pt." };
  }
}
