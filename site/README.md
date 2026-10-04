# people4people — Site institucional

Landing page pública da **people4people**, separada da aplicação SGRH
(`sgrh.people4people.pt`). Pensada para publicar em `people4people.pt`.

## Arranque rápido

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Publicar na Vercel

Este diretório (`site/`) é uma aplicação Next.js independente dentro do
mesmo repositório da aplicação SGRH. Para a publicar:

1. Na Vercel, **Add New → Project**, importe este mesmo repositório GitHub.
2. Em **Root Directory**, escolha `site`.
3. Deploy.
4. Em **Settings → Domains**, adicione `people4people.pt` (domínio
   principal, não subdomínio) e siga a configuração DNS indicada
   (normalmente um registo `A` para `76.76.21.21` no cPanel do domínio).

## Formulário de contacto

O formulário de pedido de demonstração (secção "Contacto" da Home) envia
por email via a [Resend](https://resend.com) — **sem isto configurado, os
pedidos não chegam a lado nenhum** (ficam só no log do servidor). Antes de
publicar a sério:

1. Criar conta em resend.com (tem plano gratuito, 100 emails/dia) e
   verificar o domínio `people4people.pt` lá.
2. Em **Vercel → Settings → Environment Variables** deste projeto, definir:
   - `RESEND_API_KEY` — a chave de API gerada na Resend.
   - `CONTACT_EMAIL_TO` (opcional) — para onde os pedidos são enviados;
     por omissão vai para `geral@people4people.pt`.
3. Redeploy para a variável ter efeito.

## Conteúdo a rever

- O email de contacto (`geral@people4people.pt`) é um valor provisório —
  confirme/corrija em `app/actions.ts`.
- A Política de Privacidade (`app/privacidade/page.tsx`) e os Termos de
  Utilização (`app/termos/page.tsx`) têm campos por preencher, assinalados
  com `[ ]`: nome legal da empresa, NIPC, morada da sede e comarca
  competente.
