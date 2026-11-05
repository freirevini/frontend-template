# Portabilidade

Como usar este template para começar um projeto novo ou levá-lo a outro ambiente (ex.: corporativo com Nexus e BFF).

## 1. Pré-requisitos no destino

- Node 22.x (`^22.12.0`) e npm `>= 10.9.4` (recomendado `^11.10.1`); registry Nexus pela variável `NPM_REGISTRY` (o
  `.npmrc` versionado só a referencia; credencial no *user config* da esteira; `dependencias-e-ambiente.md` §1.4).
- Para a imagem: Docker com BuildKit (ou o construtor da esteira), imagem Node 22 e imagem Nginx não-root corporativas.
- Pacotes com as versões exatas de `package.json` disponíveis no Nexus (lista em `dependencias-e-ambiente.md`).

## 2. O que copiar

| Categoria | Itens | Ação |
|---|---|---|
| Código | `src/` inteiro | Copiar |
| Configuração | `angular.json`, `package.json`, `package-lock.json`, `tsconfig*.json`, `karma.conf.js`, `proxy.conf.json`, `.nvmrc`, `.npmrc`, `.editorconfig`, `.gitignore` | Copiar e revisar |
| Imagem e esteira | `Dockerfile`, `.dockerignore`, `nginx/`, `Jenkinsfile`, `e2e/` (sem `node_modules/`) | Copiar; trocar nome do projeto e placeholders |
| Regras e docs | `AGENTS.md`, `.rules/`, `.githooks/`, ponteiros (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/regras-projeto.mdc`, `.agents/`), `docs/`, `scripts/` | Copiar sempre; depois de `git init`, `npm run hooks:install`. `.rules/local.md` (regras locais, fora do git) só se valer no destino |
| Gerado | `node_modules/`, `dist/`, `.angular/`, `coverage/` | Não copiar |
| Template | `README.coreui.md`, `CHANGELOG.md`, `.github/` | Opcional (arquivos do CoreUI) |

## 3. Pontos de adaptação

1. **Nexus**: registry do ambiente; se o lock não instalar, `npm install` para gerar outro lock no Nexus.
2. **`proxy.conf.json`**: trocar `HOST_DEV_BFF:PORTA` pelo BFF de desenvolvimento (só dev local).
3. **`src/assets/env.json`** (configuração de execução, ADR-005): versionado com os padrões de dev (`apiBase: '/api'`,
   `loginUrl` placeholder, `dataMock: true`, `footerEntities: []`). Cada ambiente monta o seu por ConfigMap em
   `/usr/share/nginx/html/assets/env.json`: `loginUrl` real, `dataMock: false` quando o BFF responder, dados legais em
   `footerEntities` se o rodapé do projeto os mostrar (prover um token a partir dessa chave em `app.config.ts`).
   `ApiService` já monta `apiBase` + `/v1` + recurso; recursos só do OpenAPI do projeto (`contratos-de-dados.md`).
4. **Nome do projeto**: `angular.json`, `package.json`, `outputPath` (e o caminho do `dist/` no `Dockerfile` e no
   `Jenkinsfile`), chaves de `localStorage`/`sessionStorage` em `theme.service.ts` e `login-redirect.service.ts`,
   `<title>` em `src/index.html`, `e2e/package.json`.
5. **Telas de demonstração**: remover `views/` do catálogo CoreUI e itens do `_nav.ts` que não forem usados.
6. **Idioma**: textos do template estão em inglês; traduzir para pt-BR (R10) e registrar `LOCALE_ID` `pt-BR`.
7. **Marca**: logos e favicon são do CoreUI; substituir pela marca do projeto (R8). Arquivos e prefixos de marca usam nomes
   convencionais (`brand-*`); dados legais só por configuração de ambiente.
8. **CI e esteira**: Karma (imagem Node 22 com Chromium, `CHROME_BIN`) e smoke E2E Playwright em `e2e/`; `Jenkinsfile`
   com placeholders (credenciais `npm-registry-url`, `npm-userconfig`, `image-registry`; variáveis da pasta
   `NODE_IMAGE`, `WEB_IMAGE`, `PLAYWRIGHT_IMAGE`, `IMAGE_REPOSITORY`, `E2E_BASE_URL_DES`; `dependencias-e-ambiente.md` §6).
   Jest só se o pipeline exigir (R7).
9. **Identidade visual**: para a aparência da landing Agenda Normativa (paleta da marca, Inter, componentes e gráficos), seguir
   `referencia-visual/07-aplicacao.md`; sem isso, o projeto fica com o visual padrão do CoreUI.
10. **Rotas limpas e servidor web**: caminho limpo com `<base href="/">` (front na raiz do subdomínio de cada ambiente);
    o Nginx da imagem devolve `index.html` para qualquer caminho sem arquivo, responde 404 em `/api/` (o Ingress roteia
    `/api/*` para o BFF antes de chegar ao contêiner) e aplica cache e cabeçalhos de segurança (`nginx/`). Em subcaminho,
    `--base-href` no build. Apache 2.4 em vez de Nginx: `FallbackResource /index.html` e os mesmos cabeçalhos.
11. **Orçamento de bundle**: o demo v5.5 pede 7 MB/8 MB no inicial; ao tirar as demos, voltar a 1,5 MB/6 MB em `angular.json`.

## 4. Checklist

```bash
export NPM_REGISTRY=<proxy npm do Nexus>              # npm 10 exige; npm >= 11.6 cai no registry público sem ela
npm ci
npm run build:prod                                    # sem erros
npm run test:ci                                       # todos passam
grep -rIoE 'localhost|appdes|appuat' dist/            # vazio
npm run docs:inventory && npm run docs:check          # documentação em dia
docker build -t <projeto> . && docker run --rm -p 4360:8080 <projeto>   # /dashboard e F5 sem 404
E2E_BASE_URL=http://127.0.0.1:4360 npm run e2e        # depois de npm --prefix e2e install
```

Depois: abrir `npm start`, conferir temas claro/escuro/automático, 375 a 1440 px e console sem erros.

## 5. Uso com o Cursor

Cursor, Antigravity, Copilot e Codex leem `AGENTS.md` sozinhos; Cursor também carrega `.cursor/rules/regras-projeto.mdc`,
Antigravity `.agents/rules/regras.md` (e `/pronto` em `.agents/workflows/pronto.md`), Claude Code `CLAUDE.md` (que importa
`AGENTS.md`), Gemini CLI `GEMINI.md`. Todos são ponteiros: regra se edita só em `AGENTS.md` ou
`.rules/`. Abra esta pasta como raiz do workspace. Ler `docs/README.md` e este arquivo antes de qualquer adaptação; a cada
mudança, atualizar a documentação (R13) e terminar com `npm run verify`.

Projeto derivado que cria regras próprias (idioma oficial, marca, base de conhecimento, ficha por página): seguir o modelo
da `landing-analitica` (`.rules/projeto.md` R10, R12, R14, R15 e `scripts/docs-check.js`, que liga as verificações de cor,
de mapeamento de dados e de fichas de página sozinho quando essas regras existem).
