# SGRH — Sistema de Gestão de Recursos Humanos

Aplicação web para gestão integrada de colaboradores, horários de trabalho,
picagens, ausências e contratos de trabalho, desenvolvida com base no
[Documento Funcional SGRH v1.0].

## Stack técnica

- **Next.js 16** (App Router, Server Actions) + TypeScript
- **Prisma** + **SQLite** (base de dados local; fácil de trocar para
  PostgreSQL/MySQL alterando `provider` em `prisma/schema.prisma`)
- **NextAuth v5** (Credentials, sessão JWT) para autenticação
- **Tailwind CSS** para a interface
- **xlsx** para importação/exportação de ficheiros Excel

## Arranque rápido

```bash
npm install
cp .env.example .env      # e defina um AUTH_SECRET próprio
npx prisma migrate deploy
npm run db:seed           # cria a estrutura base e o utilizador administrador
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Vai ser redirecionado
para `/login`.

O comando `db:seed` cria o utilizador **Frederico Peres**
(`fred.gp92@gmail.com`) com perfil **Administrador do Sistema** e uma
password temporária aleatória, impressa uma única vez na consola. No
primeiro login, a aplicação obriga à definição de uma nova password
(`mustChangePassword`).

## Módulos implementados (mapeados ao documento funcional)

| Módulo | Rota | Requisitos cobertos |
|---|---|---|
| Perfis de Acesso e Permissões | `/acessos` | PA-01 a PA-04, PA-06 (PA-05 SSO/MFA fica documentado como próxima fase — ver *Limitações*) |
| Gestão de Recursos | `/colaboradores`, `/estrutura` | GR-01 a GR-07 |
| Horário Manual | `/horarios` | HM-01 a HM-06 |
| Horário em Ciclo | `/horarios/ciclos` | HC-01 a HC-05 |
| Horário Preditivo | `/horarios/preditivo` | HP-01 a HP-08 (HP-09 fica como próxima fase) |
| Carregamento de Dados (Excel/API) | `/colaboradores/importar`, `/horarios/preditivo` | CD-01 a CD-04 |
| Picagens | `/picagens` | PI-01 a PI-06 (PI-07 é gap de hardware, fora de âmbito) |
| Ausências | `/ausencias`, `/ausencias/tipos` | AU-01 a AU-08 |
| Contratos de Trabalho | `/contratos` | CT-01 a CT-06 |

### Controlo de acesso (RBAC)

Perfis suportados: `ADMIN_SISTEMA`, `ADMIN_RH`, `GESTOR_EQUIPA`,
`COLABORADOR`, `RH_CONTRATOS`, `AUDITOR` — ver `src/lib/roles.ts` para a
matriz de permissões por módulo. Um utilizador pode acumular vários
perfis. O perfil `GESTOR_EQUIPA` pode ter âmbito restrito a um
departamento (gerido em `/acessos`).

### Motor preditivo

Implementado como modelo estatístico (médias móveis por dia da semana),
conforme a nota de implementação do documento funcional — não é um motor
de machine learning. Gera propostas em modo rascunho para revisão manual
antes da publicação.

## Limitações conhecidas / próximas fases

- **SSO / MFA** (PA-05): autenticação atual é email + password (bcrypt).
  Preparado para evoluir para OAuth2/SSO adicionando providers ao
  NextAuth.
- **Upload real de documentos** (contratos, comprovativos de ausência,
  documentos de colaborador): atualmente é guardado apenas o nome do
  ficheiro, sem armazenamento binário — para produção, ligar a um serviço
  de blob storage (S3, Azure Blob, etc.).
- **Terminais físicos de picagem** (PI-07): fora de âmbito nesta fase.
- **Recalibração do modelo preditivo** (HP-09): não implementado.
- **Base de dados**: SQLite é adequado para desenvolvimento/demonstração;
  para produção recomenda-se PostgreSQL.

## Scripts

```bash
npm run dev          # servidor de desenvolvimento
npm run build         # build de produção
npm run lint           # ESLint
npm run db:migrate    # nova migração Prisma
npm run db:seed       # (re)popular dados base + admin
npm run db:studio     # Prisma Studio (explorar a BD)
```
