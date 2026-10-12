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
  - `(tabs)/` — navegação principal depois do login
- `lib/api.ts` — cliente HTTP (token Bearer guardado em `expo-secure-store`)
- `lib/auth.tsx` — contexto de autenticação (login/logout/sessão)
- `lib/theme.ts` — paleta de cores e espaçamentos (alinhado com a app web)

## Validar antes de commit

```bash
npx tsc --noEmit
npx expo export --platform android --output-dir /tmp/expo-export-check
```

## Publicar na Play Store

Falta cobrir numa fase posterior: ícone/splash definitivos, `eas.json`, e o
guia de submissão (requer conta Google Play Console e conta Expo/EAS do
cliente — não geríveis por aqui).
