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

## Registo dos pedidos na base de dados

Além do email, cada pedido (demonstração, informação ou suporte) fica
gravado na tabela `leads` do Supabase — a mesma base de dados da app SGRH.
Pedidos comerciais (demonstração/informação) ficam com `type = 'new_lead'`;
pedidos de suporte ficam com `type = 'support'`. O campo `source` guarda o
tipo original do formulário (`demo` | `info` | `support`).

1. Criar a tabela — correr este SQL no **SQL Editor** do Supabase:

   ```sql
   create table if not exists public.leads (
     id uuid primary key default gen_random_uuid(),
     type text not null check (type in ('new_lead', 'support')),
     source text not null check (source in ('demo', 'info', 'support')),
     company_name text not null,
     contact_name text not null,
     role text,
     phone text,
     email text not null,
     nipc text,
     employee_count text,
     situation text,
     data_consent boolean,
     marketing_consent boolean,
     created_at timestamptz not null default now()
   );

   create index if not exists leads_type_idx on public.leads (type);
   create index if not exists leads_created_at_idx on public.leads (created_at desc);
   ```

2. Em **Vercel → Settings → Environment Variables** deste projeto, definir
   `DATABASE_URL` com a mesma connection string usada pela app SGRH
   (`.env` da raiz do repositório).
3. Redeploy para a variável ter efeito.

Sem `DATABASE_URL` configurada, os pedidos continuam a ser enviados por
email na mesma — só não ficam registados na base de dados (fica um aviso
no log do servidor).

## Conteúdo a rever

- O email de contacto (`geral@people4people.pt`) é um valor provisório —
  confirme/corrija em `app/actions.ts`.
- A Política de Privacidade (`app/privacidade/page.tsx`) e os Termos de
  Utilização (`app/termos/page.tsx`) têm campos por preencher, assinalados
  com `[ ]`: nome legal da empresa, NIPC, morada da sede e comarca
  competente.
