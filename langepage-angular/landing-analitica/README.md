# landing-analitica

Painel analítico com menus, gráficos e relatórios para download, em **Angular 20.3** (componentes standalone) com CoreUI 5.5.

## Pré-requisitos

| Ferramenta | Versão |
|---|---|
| Node.js | 22.x (`^22.12.0`) |
| npm | `>= 10.9.4` (recomendado `^11.10.1`), usando o registry Nexus corporativo |

Com nvm: `nvm install 22 && nvm use` (lê `.nvmrc`). Não é preciso instalar o Angular CLI global; os comandos usam a CLI local.

Registry: o `.npmrc` versionado lê a variável `NPM_REGISTRY` (a esteira a define com o proxy npm do Nexus). Sem a
variável, o npm 11.6 ou mais novo cai no registry público; com npm 10, exporte `NPM_REGISTRY` antes de qualquer comando
`npm`. Detalhes em `docs/dependencias-e-ambiente.md` 1.4.

## Como executar

```bash
npm ci
npm start         # http://localhost:4200 (rotas limpas: /triagent, /scalation, /triagent#tabela-analitica)
```

Produção: uma imagem (`Dockerfile`: build Node 22 + Nginx não-root na porta 8080, `nginx/default.conf` com fallback
para `index.html`) promovida entre ambientes; cada ambiente monta o seu `assets/env.json` (ConfigMap) e o Ingress roteia
`/api/*` para o BFF. Detalhes em `docs/portabilidade.md` 4.3 e 4.8.

```bash
docker build -t landing-analitica .          # imagens públicas provisórias; na esteira, --build-arg NODE_IMAGE/WEB_IMAGE/NPM_REGISTRY
docker run --rm -p 8080:8080 landing-analitica
```

Esteira: `Jenkinsfile` declarativo (checkout, `npm ci` e `npm run verify` na imagem Node 22 com Chromium headless,
varreduras SonarQube/Veracode, imagem, E2E em DES e promoção `develop` → DES, `release/*` → UAT, tag + GMUD → PRD).
Credenciais, imagens e endereços vêm da configuração do Jenkins, nunca do repositório; lista em
`docs/dependencias-e-ambiente.md` 6.

Smoke E2E (Playwright, pasta `e2e/` com `package.json` próprio, fora do build e do Karma): as quatro páginas por URL
direta, subitem do menu, troca de tema, chat simulado, Excel da Tabela Analítica e rota inexistente.

```bash
npm --prefix e2e ci                          # ou npm --prefix e2e install, até existir e2e/package-lock.json
docker run --rm -p 4300:8080 landing-analitica   # ou: npx ng serve --port 4300
npm run e2e                                  # alvo: E2E_BASE_URL (padrão http://localhost:4300)
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm start` | Servidor de desenvolvimento, com proxy de `/api` definido em `proxy.conf.json` |
| `npm run build:prod` | Build de produção em `dist/landing-analitica/browser` |
| `npm run test:ci` | Testes unitários (Karma/Jasmine, ChromeHeadless) uma vez |
| `npm run verify` | Documentação, regras, build de produção e testes: definição de pronto |
| `npm run e2e` | Smoke E2E (Playwright) contra `E2E_BASE_URL`; fora do `verify` (precisa do app no ar e de navegador) |

## Estrutura

- `src/app/containers/default-layout/`: layout com menu lateral (`_nav.ts`), header e rodapé.
- `src/app/views/`: telas (cada uma com `routes.ts`); rotas de primeiro nível em `src/app/app.routes.ts`, providers em `src/app/app.config.ts`.
- `src/app/core/services/`: serviços compartilhados, como o tema claro/escuro e o serviço base de API.
- `src/app/core/config/` + `src/assets/env.json`: configuração em tempo de execução (`apiBase`, `loginUrl`, `chatMock`, `dataMock`, `footerEntities`), lida antes do bootstrap.
- `src/environments/`: `environment.ts` (dev) e `environment.prod.ts` (produção), só com flags de build (`production`).
- `docs/glossario-ptbr.md`: termos oficiais da interface.

## Regras

Regras para pessoas e IAs (Claude Code, Cursor, Antigravity, Copilot): `AGENTS.md` (entrada) e `.rules/` (texto
vinculante). `CLAUDE.md`, `GEMINI.md`, `.cursor/` e `.agents/` só apontam para eles. Antes de declarar uma entrega pronta:
`npm run verify`. Uma vez por clone: `npm run hooks:install`.

## Licença

Baseado em um template open source sob licença MIT; o aviso de copyright exigido pela licença está em `LICENSE`.
