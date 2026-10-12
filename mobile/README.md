# people4people — App mobile (Colaborador)

App React Native (Expo + expo-router) para a Google Play Store. Mostra **apenas**
funcionalidades de Colaborador (self-service) — mesmo para contas com outro
perfil na app web — e fala diretamente com a mesma base de dados do SGRH
através da API em `src/app/api/mobile/**` do projeto Next.js na raiz do
repositório.

## Desenvolvimento

```bash
cd mobile
npm install
npx expo start
```

Abre no telemóvel com a app **Expo Go** (Android/iOS) a ler o QR code, ou usa
um emulador Android (`npx expo start --android`).

A app liga sempre a `https://sgrh.people4people.pt` (ver `app.json` →
`expo.extra.apiBaseUrl`). Não precisa de nenhum `.env` local.

## Estrutura

- `app/` — ecrãs (expo-router, routing por ficheiros)
  - `login.tsx` — autenticação
  - `(tabs)/` — navegação principal depois do login: início, ausências,
    férias, vencimento, horário, picagens, perfil
  - `avaliacoes/`, `notificacoes/` — acessíveis a partir do separador Perfil
- `lib/api.ts` — cliente HTTP (token Bearer guardado em `expo-secure-store`)
- `lib/auth.tsx` — contexto de autenticação (login/logout/sessão)
- `lib/theme.ts` — paleta de cores e espaçamentos (alinhado com a app web)
- `lib/dates.ts` — formatação de datas em pt-PT
- `components/ui.tsx` — Card, Badge, PageHeader, botões, estados vazios/erro
  (equivalente a `src/components/ui.tsx` na app web)

## Funcionalidades cobertas

- Dashboard (próximo turno, saldo de férias, ausências pendentes, desvios)
- Ausências: listar, pedir (intervalo de dias), cancelar pedido pendente
- Férias: calendário mensal interativo (marcar/desmarcar dias), saldo e
  histórico por ano
- Vencimento: histórico de recibos, detalhe (rubricas) e download/partilha
  do PDF
- Horário: turnos da semana, navegação semana a semana
- Picagens: entrada/saída/pausa com geolocalização, histórico, justificar
  desvios
- Perfil: dados da conta, acesso a Avaliações e Notificações, terminar sessão
- Avaliações: listar, preencher autoavaliação (perguntas de escala, escolha
  única e texto livre)
- Notificações: feed de notificações próprias + mensagens por ler

## Validar antes de commit

```bash
npx tsc --noEmit
npx expo export --platform android --output-dir /tmp/expo-export-check
```

## Publicar na Play Store

Falta cobrir numa fase posterior: ícone/splash definitivos, `eas.json`, e o
guia de submissão (requer conta Google Play Console e conta Expo/EAS do
cliente — não geríveis por aqui).
