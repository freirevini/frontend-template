# frontend-template-angular

Template front-end em **Angular 20.3** (componentes standalone) sobre o [CoreUI Free Angular Admin Template v5.5](https://github.com/coreui/coreui-free-angular-admin-template),
com seletor de tema **claro, escuro e automático** no header. Ponto de partida para novos painéis.

## Pré-requisitos

| Ferramenta | Versão |
|---|---|
| Node.js | 22.x (`^22.12.0`) |
| npm | `>= 10.9.4` (recomendado `^11.10.1`) |
| Git | qualquer versão recente (opcional) |

Com [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) ou [nvm-windows](https://github.com/coreybutler/nvm-windows):

```bash
nvm install 22
nvm use           # nesta pasta, `nvm use` lê o arquivo .nvmrc (22)
```

Não é preciso instalar o Angular CLI global: os comandos usam a CLI local do projeto.

## Como executar

```bash
npm ci            # instala exatamente as versões do package-lock.json
npm start         # abre em http://localhost:4200
```

Para usar outra porta: `npm start -- --port 4201`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento com recarga automática |
| `npm run build:prod` | Build de produção em `dist/coreui-free-angular-admin-template/browser` |
| `npm run test:ci` | Testes unitários (Karma/Jasmine) uma vez, sem abrir janela |
| `npm run verify` | Documentação, regras, build de produção e testes: definição de pronto |
| `npm test` | Testes em modo observação, com o Chrome aberto |
| `docker build -t frontend-template-angular .` | Imagem de produção (Nginx não-root, porta 8080) |
| `npm run e2e` | Smoke E2E (Playwright, pacote `e2e/`; instalar antes com `npm --prefix e2e install`; app no ar em `E2E_BASE_URL`) |

## Tema claro, escuro e automático

- O seletor fica no canto superior direito (ícone de sol, lua ou contraste).
- **Automático** segue o tema do sistema operacional e muda junto com ele.
- A escolha fica salva no navegador. O padrão é **Claro**.
- Implementação: `src/app/core/services/theme.service.ts` e `src/scss/_theme-dark.scss`.
  O serviço liga também o escuro nativo do CoreUI 5 (`data-coreui-theme`); `_theme-dark.scss` vem por último e vence.
  O `ColorModeService` do CoreUI não é usado.
- Componentes novos devem usar `var(--cui-*)` em vez de cores fixas para funcionar nos dois temas.

## Ambientes e API

- Rotas limpas (`/dashboard`, `/base/accordion`), sem `#`; o servidor web devolve `index.html` para qualquer caminho
  (`nginx/default.conf`).
- Configuração por ambiente em `src/assets/env.json` (`apiBase`, `loginUrl`, `dataMock`, `footerEntities`), lida ao
  abrir o app. A mesma imagem vai a todos os ambientes; cada um monta o seu `env.json` (ConfigMap) e o Ingress encaminha
  `/api/*` ao BFF. `src/environments/` guarda só a flag `production`.
- Chamadas ao BFF só por `ApiService` (`apiBase` + `/v1` + recurso do OpenAPI do projeto); o template não tem recurso.
  Erros viram textos em pt-BR; 401 leva ao `loginUrl`. Com `dataMock: true`, o header mostra "Dados simulados".
- `proxy.conf.json` encaminha `/api` só no `npm start`. Troque o destino `http://HOST_DEV_BFF:PORTA`
  pelo backend de desenvolvimento antes de chamar a API. O build de produção não usa esse arquivo.
- npm: o `.npmrc` lê o registry de `NPM_REGISTRY` (Nexus na esteira); com npm 10, exporte a variável antes do `npm ci`.

## Documentação

A pasta `docs/` descreve arquitetura, dados, design system, dependências e como portar o projeto; comece por `docs/README.md`.
Toda mudança de código atualiza a documentação (regra R13) e passa em `npm run verify`.

## Regras do projeto

Regras para pessoas e IAs (Claude Code, Cursor, Antigravity, Copilot): `AGENTS.md` (entrada) e `.rules/` (texto
vinculante). `CLAUDE.md`, `GEMINI.md`, `.cursor/` e `.agents/` só apontam para eles. Antes de declarar pronto: `npm run verify`.

## Licença

MIT, herdada do CoreUI (ver `LICENSE`). O README original do CoreUI está em `README.coreui.md`.
