# ADR-008: Português do Brasil como idioma oficial, com glossário

Data: 2026-10-27
Situação: aceita

## Contexto

O template chega em inglês (menu, títulos, rótulos, exemplos). O público do painel é interno e brasileiro; datas, números e moeda precisam seguir o padrão local. Traduções feitas caso a caso geram inconsistência ("Painel" vs "Dashboard", "Menu suspenso" vs "Dropdown") entre menu, breadcrumb e títulos. O projeto também será mantido por outra IA, que precisa de uma fonte única de termos.

## Decisão

1. pt-BR é o idioma oficial (R12) para todo texto visível (menu, títulos de rota e breadcrumbs, rótulos, botões, placeholders, mensagens, `aria-label`, `title`, `alt`, legendas, colunas e nomes de arquivos exportados), para a documentação em `docs/` e para mensagens de commit (prefixo Conventional Commits + descrição em pt-BR).
2. Identificadores, nomes de arquivos de código e comentários continuam em inglês.
3. Configuração técnica em `src/app/app.module.ts`: `registerLocaleData(localePt, 'pt-BR')`, `{ provide: LOCALE_ID, useValue: 'pt-BR' }`, `{ provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }`; `<html lang="pt-BR">` em `src/index.html`. Datas `dd/mm/aaaa`, números `1.234,56`, moeda `R$`, sempre via pipes do Angular ou `Intl` (`Intl.DateTimeFormat('pt-BR', ...)` em `period-range.ts` e `default-header.component.ts`), nunca montando texto à mão.
4. `docs/glossario-ptbr.md` é a fonte única de termos: navegação, cores contextuais, interface geral, formulários, indicadores, páginas do produto (Início, Triagent, Scalation, Analítico), segmentos de negócio (Atacado, Corporativo, Plataforma, Varejo), textos do Tráfego e da Cascata, datas e a lista "Não traduzir". Termo novo entra no glossário antes de ser usado.
5. "Triagent" e "Scalation" são nomes próprios do produto e não se traduzem. Nomes de marcas, `Lorem ipsum`, conteúdo de `<code>`, classes CSS, seletores, `routerLink` e nomes de ícones também não.
6. Strings internas do `@coreui/angular` sem input para tradução são exceção conhecida; `node_modules` não é alterado.

## Consequências

- Consistência entre menu (`_nav.ts`), rotas (`data.title`), breadcrumbs e títulos de página; revisões podem conferir contra o glossário.
- Texto trazido de documentação em inglês (CoreUI, Angular) precisa ser traduzido antes de entrar; o catálogo de componentes do template foi integralmente traduzido.
- Formatação depende do locale registrado; testes que verificam texto formatado devem rodar com `LOCALE_ID` `pt-BR` (os specs do projeto já assumem isso).
- `npm run docs:check` não valida o glossário automaticamente; a revisão é manual, por isso a regra "termo novo entra antes" está em R12.
