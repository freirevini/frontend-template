# Contratos de dados

## 1. Situação

Não há dados de negócio: todas as telas usam valores fixos ou aleatórios do próprio template (por exemplo,
`src/app/views/dashboard/dashboard-charts-data.ts` gera séries aleatórias). Não existe pasta `src/assets/data/` nem
recurso de API: o template não chama o BFF. A camada para isso está pronta (ADR-005, fonte: ADR-023 da
`landing-analitica`): configuração de execução (`src/assets/env.json`), `ApiService`, interceptor de erros, XSRF, textos
pt-BR e utilitários de paginação. O projeto derivado traz o próprio OpenAPI e só então cria recursos (R4).

## 2. Configuração de execução (`src/assets/env.json`)

Lida antes do bootstrap por `src/app/core/config/runtime-config.service.ts` (`provideAppInitializer`). A mesma imagem
vai a DES, UAT e PRD; cada ambiente monta o seu arquivo por ConfigMap em `/usr/share/nginx/html/assets/env.json`.

| Chave | Versionado | Uso | Sem o arquivo ou com valor inválido |
|---|---|---|---|
| `apiBase` | `"/api"` | prefixo de toda chamada ao BFF; caminho relativo, sem host (R6); barra final é removida | `/api` |
| `loginUrl` | `"/api/v1/autenticacao/login"` (placeholder, suposição S2 do ADR-005) | destino do 401, com `?retorno=<endereço atual>` | o mesmo placeholder |
| `dataMock` | `true` | `true` = mocks locais em `src/assets/data/` e selo "Dados simulados" no header; `false` = BFF | `true` no build de dev, `false` no de produção (nunca número fictício tomado por real) |
| `footerEntities` | `[]` | dados legais (`name`, `cnpj`, `address`) para o rodapé de um painel derivado; só no ConfigMap, nunca versionados | `[]` |

Cada chave é validada sozinha: tipo errado mantém o padrão daquela chave; chave desconhecida é ignorada; falha de leitura
gera um único `console.error` sem o corpo da resposta. O `docs:check` exige no `env.json` versionado exatamente essas
quatro chaves, `apiBase` e `loginUrl` relativos e `footerEntities` vazio.

## 3. Convenções do contrato v1

Padrão corporativo para o BFF (respostas da arquitetura; `../landing-analitica/docs/planejamento/adequacao-padroes-corporativos.md` §1):

- **Caminhos:** `/api/v1/<recurso>/{id}/<sub-recurso>`, substantivos no plural, minúsculos, kebab-case. O front chama
  `ApiService` com o caminho depois de `/v1` (`api.get('/<recurso>')` → `apiBase` + `/v1/<recurso>`); nunca URL absoluta.
- **Contrato:** OpenAPI contract-first, escrito antes do primeiro recurso (ex.: `docs/contratos/openapi-<produto>-v1.yaml`
  no projeto derivado). Tipos do front são interfaces à mão conferidas contra o OpenAPI em teste; sem gerador de cliente.
- **Corpo:** JSON com campos em camelCase; upload em `multipart/form-data` (`api.postMultipart`, o navegador define o
  `boundary`). Limite de payload do gateway: ~10 MB por requisição.
- **Credenciais:** front e BFF na mesma origem; o cookie de sessão vai sozinho (sem `withCredentials`).

### 3.1 Paginação

Listagem é sempre paginada: `page` (0 = primeira), `size` (50 a 100; `MAX_PAGE_SIZE = 100` em
`src/app/core/http/api-page.ts`), `sort` repetível (`sort=nome,asc&sort=id,desc`; array em `QueryParams`). Resposta no
envelope do Spring (suposição S6):

```json
{ "content": [], "totalElements": 0, "totalPages": 0, "number": 0, "size": 100 }
```

`fromSpringPage(page, converter)` valida o envelope e devolve `DataPage` (`items`, `total`, `page`, `size`);
`localPage` faz o mesmo sobre uma lista do mock; `collectPages(fetchPage, maxRows)` busca página após página, em
sequência e cancelável, até `maxRows` (para exportação no navegador, R9).

### 3.2 Erros (RFC 7807, Problem Details)

Corpo esperado do BFF:

```json
{
  "timestamp": "2026-11-04T10:15:30-03:00",
  "status": 400,
  "code": "VAL-001",
  "message": "texto do servidor (nunca exibido)",
  "details": [{ "campo": "fim", "code": "VAL-001", "message": "..." }],
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

O interceptor (`src/app/core/http/api-error.interceptor.ts`) transforma toda falha de chamada sob `apiBase` em
`ApiProblem` com só `status`, `code` (famílias `VAL`, `AUT`, `NEG`, `SIS` + três dígitos; outro valor é descartado) e
`traceId` (letras, dígitos e hífen, até 64). `message` e `details` do servidor nunca chegam à tela. Pedidos fora de
`apiBase` (arquivos de `assets/`) passam sem tratamento.

| Situação | `kind` | Texto (`http-error-texts.ts`) |
|---|---|---|
| status 0 (rede, CORS, erro lançado) | `network` | Sem conexão com o servidor. Verifique a rede e tente novamente. |
| 401 | `unauthenticated` | nenhum: o interceptor leva a `loginUrl` (seção 4) |
| 403, ou `AUT-002`/`AUT-003` | `forbidden` | Você não tem acesso a esta informação. |
| 404 | `notFound` | A informação pedida não foi encontrada. |
| 429 | `rateLimited` | Muitos pedidos em pouco tempo. Aguarde um instante e tente novamente. |
| 504, ou `SIS-002` | `timeout` | O servidor demorou a responder. Tente novamente em instantes. |
| outro 4xx | `badRequest` | Não foi possível processar o pedido. Confira os filtros e tente novamente. |
| 5xx | `serverError` | Não foi possível carregar os dados agora. Tente novamente em instantes. (o bloco pode usar a própria frase) |

Com `traceId`, o bloco mostra numa linha abaixo "Código de suporte: <traceId>" (`supportCodeText`).
`loadErrorMessage(erro, fraseDoBloco)` escolhe o texto: frase do bloco para falha genérica, texto da tabela para os
status específicos, nada para 401.

## 4. Sessão e login (R5)

- Sessão só pelo cookie `HttpOnly` do BFF; CSRF no padrão do Angular (suposição S3): o BFF grava o cookie legível
  `XSRF-TOKEN` e o `HttpClient` devolve o valor no cabeçalho `X-XSRF-TOKEN` em POST, PUT, PATCH e DELETE
  (`withXsrfConfiguration` em `provideAppHttpClient`).
- 401: `LoginRedirectService` navega a página inteira para `loginUrl?retorno=<caminho+busca+fragmento atual>` (ou
  `&retorno=` se `loginUrl` já tem `?`), uma vez por página, e grava antes o horário em `sessionStorage`
  (`frontend-template-angular.login-redirect-at`; só um número, nunca token).
- Quebra de laço: novo 401 menos de 60 s depois da última ida ao login não redireciona; o layout mostra
  `app-session-expired-notice` ("Sua sessão expirou e não foi possível entrar de novo automaticamente." + link "Entrar
  novamente", que também grava o horário).

## 5. Como ligar um recurso (R4)

1. Escrever o recurso no OpenAPI do projeto derivado.
2. Até o BFF responder: mock em `src/assets/data/<arquivo>.json` com a mesma forma da resposta, documentado aqui (o
   `docs:check` exige uma linha por arquivo da pasta), e `dataMock: true` no `env.json`.
3. Serviço de dados que escolhe a origem por `RuntimeConfigService.config.dataMock`. Exemplo comentado (recurso fictício;
   não existe no template):

```ts
// @Injectable({ providedIn: 'root' })
// export class ExemploDataService {
//   private readonly api = inject(ApiService);
//   private readonly http = inject(HttpClient);
//   private readonly runtimeConfig = inject(RuntimeConfigService);
//
//   page(page: number, size = MAX_PAGE_SIZE): Observable<DataPage<Exemplo>> {
//     return this.runtimeConfig.config.dataMock
//       ? this.http.get<Exemplo[]>('assets/data/exemplos.json').pipe(map((rows) => localPage(rows, page, size)))
//       : this.api.get<SpringPage<Exemplo>>('/exemplos', { page, size }).pipe(map((p) => fromSpringPage(p, (row) => row)));
//   }
// }
```

4. Erro no bloco: `loadErrorMessage(erro, 'Não foi possível carregar <o bloco>.')`; nunca a mensagem do servidor.

## 6. Formatação

Ao traduzir para pt-BR, formatar com pipes do Angular ou `Intl` em `pt-BR` (datas `dd/mm/aaaa`, números
`1.234,56`, moeda `R$`), registrando o locale em `src/app/app.config.ts` (`registerLocaleData` + `LOCALE_ID`).
