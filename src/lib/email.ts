import { Resend } from "resend";

// Envio de email por Resend — a mesma integração já usada no site
// institucional (site/), aqui para o envio do recibo de vencimento ao
// colaborador. Sem RESEND_API_KEY configurada, devolve um erro claro em
// vez de rebentar — a funcionalidade fica desativada graciosamente até a
// variável de ambiente ser configurada no projeto Vercel da aplicação.
export async function sendEmailWithAttachment(params: {
  to: string;
  subject: string;
  html: string;
  attachment: { filename: string; content: Buffer };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PAYROLL_EMAIL_FROM;
  if (!apiKey || !from) {
    return {
      ok: false,
      error:
        "Envio de email não configurado — defina RESEND_API_KEY e PAYROLL_EMAIL_FROM nas variáveis de ambiente.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: [{ filename: params.attachment.filename, content: params.attachment.content }],
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido ao enviar o email." };
  }
}
