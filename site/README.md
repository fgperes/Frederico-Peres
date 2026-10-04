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

## Conteúdo a rever

- O email de contacto (`geral@people4people.pt`) é um valor provisório —
  confirme/corrija em `app/page.tsx`.
