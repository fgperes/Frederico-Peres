# Publicar a app na Google Play Store

A app está pronta a publicar (código, ícones, splash screen e configuração
de build já feitos). Falta um conjunto de passos que só tu consegues fazer,
porque exigem contas pessoais/da empresa (Google e Expo) — não tenho acesso
a nenhuma delas. Este guia percorre exatamente esses passos, por ordem.

## 0. O que já está pronto

- Código completo da app (`mobile/`), já validado (`tsc`, bundling Metro).
- Identidade visual: ícone, ícone adaptativo Android e splash screen com a
  marca "Elo" da people4people, em violeta (`#7c3aed`).
- `app.json`: nome "people4people", `package`/`bundleIdentifier`
  `pt.people4people.sgrh`, permissões de localização (picagens).
- `eas.json`: perfis de build `development`, `preview` e `production`
  (gera `.aab`, o formato que a Play Store exige) já configurados.

## 1. Conta Expo (EAS) — gratuita para começar

1. Cria conta em https://expo.dev/signup (ou usa uma já existente).
2. No teu computador (não é preciso ser aqui neste ambiente), dentro da
   pasta `mobile/`:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. Associa este projeto à tua conta Expo:
   ```bash
   eas init
   ```
   Isto escreve automaticamente um `extra.eas.projectId` no `app.json` —
   não o escrevas à mão.

## 2. Conta Google Play Console — taxa única de 25 USD

1. Vai a https://play.google.com/console/signup e paga a taxa única de
   inscrição de developer (25 USD, cartão de crédito).
2. Cria uma **App nova** na Play Console:
   - Nome: `people4people`
   - Idioma predefinido: Português (Portugal)
   - Tipo: App · Gratuita
   - Aceita as declarações (conteúdo, políticas, exportação).
3. Em **Configuração da app** (App content), preenche o obrigatório antes
   de conseguires publicar:
   - **Política de privacidade**: precisas de um URL público (ex.: uma
     página em `people4people.pt/privacidade`). Se ainda não existir, diz-
     me e eu crio essa página no site de marketing.
   - **Classificação de conteúdo** (questionário da Play Store).
   - **Público-alvo**: não dirigido a crianças.
   - **Permissões sensíveis**: declarar o uso de localização (picagens) e
     justificar o motivo (já previsto nas perguntas do questionário).
   - **Dados de contacto** e categoria da app (Produtividade ou Negócios).

## 3. Gerar a primeira build de produção (.aab)

Já no teu computador, dentro de `mobile/`:

```bash
eas build --platform android --profile production
```

- A primeira vez que corres isto, o EAS pergunta se queres que ele gira a
  keystore de assinatura da app por ti — **responde que sim** (é o mais
  simples e seguro; o EAS guarda a chave na tua conta Expo).
- A build corre na cloud da Expo (não precisas de Android Studio); no fim
  dá-te um link para descarregar o `.aab`.

## 4. Submeter à Play Store

Opção A — automática (recomendada):
```bash
eas submit --platform android --profile production
```
Pede a localização do `.aab` (usa o da build anterior) e as credenciais de
acesso à Play Console (um ficheiro JSON de "service account" — a `eas
submit` explica como criar um na Google Cloud Console na primeira vez que
corres o comando).

Opção B — manual: descarrega o `.aab` do link que a `eas build` deu, e na
Play Console vai a **Produção → Criar nova versão** → carrega o ficheiro.

## 5. Teste interno antes de produção (recomendado)

Antes de lançar para todos, usa a faixa **Teste interno** da Play Console
(até 100 testadores, por email) — o `eas.json` já tem isso configurado em
`submit.production.android.track: "internal"`. Adiciona o teu email e o de
alguns colaboradores de confiança como testadores, confirma que tudo
funciona no telemóvel real, e só depois promove a versão para Produção
dentro da própria Play Console (um botão, sem nova build).

## 6. Atualizações seguintes

Para cada nova versão:
```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```
O número de versão incrementa sozinho (`eas.json` tem
`cli.appVersionSource: "remote"` e `build.production.autoIncrement: true`).

Para alterações pequenas de JavaScript (sem adicionar módulos nativos
novos), também é possível usar **EAS Update** para publicar sem passar pela
revisão da Play Store — mas isso fica fora do âmbito desta primeira versão.

## Itens que preciso de confirmar contigo

- **Política de privacidade**: já existe algures, ou crio uma página nova
  no site de marketing?
- **Ícone/nome definitivos**: usei a marca "Elo" já existente na app web,
  em violeta. Se quiseres outra versão (ex.: com o nome por extenso, outra
  cor), digo-te o que mudar no ficheiro `assets/icon.png`.
- **Capturas de ecrã e descrição da loja**: a Play Console pede pelo menos
  2 capturas de ecrã de telemóvel e uma descrição curta/longa da app — não
  tenho forma de gerar screenshots reais sem um dispositivo/emulador; passo
  a usar a Expo Go para tirar essas capturas quando estiveres a testar, ou
  faço-as eu assim que tiver acesso a um emulador neste ambiente.
