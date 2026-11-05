# Testes — toda correção vira teste, toda regra vira teste

Vinculante. Comandos deste projeto: rápido `npm run test:ci` (Karma/Jasmine, ChromeHeadless, uma vez); completo
`npm run verify` (docs, regras, build de produção e testes). Testes ficam ao lado do código, nomeados
`<arquivo>.spec.ts`; estado pronto: JSON real de `src/assets/data/` (os specs do chat rodam contra
`chat-fluxo-mock.json`), `chat-test-helpers.ts` e `HttpTestingController` para HTTP. Relógio e download são trocáveis
nos serviços (`ChatSessionService.now`, propriedade `download`) para teste.

## 1. Bug corrigido

1. Escreva um teste que reproduz o bug: mesmas condições, mesmo resultado errado.
2. Rode: o teste **tem que falhar**. Se passa, não captura o bug; reescreva.
3. Corrija o código.
4. Rode: o teste passa e o resto da suíte continua verde.
5. Nomeie pelo comportamento, não pelo ticket: `test_cupom_e_promocao_nao_acumulam`, não
   `test_bug_42`.
6. Registre em `.rules/erros.md`. Teste e registro vão no mesmo commit da correção; o hook
   recusa commit `fix` sem os dois.

Corrigir sem teste não é corrigir: o bug volta na próxima mudança e ninguém avisa.

## 2. Regra

Toda regra (negócio, cálculo, validação, permissão, fluxo) tem teste que a prova. Regra nova
entra com teste no mesmo commit. Regra sem teste é sugestão: será quebrada sem aviso.

## 3. Estado pelo caminho curto

Para testar um ponto, construa o estado direto (fixture, factory, snapshot, seed) e exercite só
aquele pedaço. Não refaça o fluxo inteiro. Fluxo inteiro é teste de integração e roda na
suíte completa.

## 4. Quando rodar

- Rápido: antes de declarar qualquer coisa pronta, a cada correção. Cole a última linha.
- Completo: antes de build, deploy e PR. Vermelho não sobe.
- CI roda no push; vermelho devolve relatório e você corrige a partir dele.
- Tocou em código coberto: rode sem ser mandado.

## 5. Proibido

- Apagar, comentar, marcar `skip`/`xfail`/`todo` ou afrouxar asserção para fazer passar.
- Mudar o valor esperado sem confirmar com o usuário que **a regra mudou**.
- Mockar a unidade sob teste. Mock é para fronteira: rede (`HttpTestingController`), relógio, download, `localStorage`.
- Commitar `fdescribe`, `fit`, `xdescribe` ou `xit`.
- Teste sem asserção ou com asserção tautológica.
- Dizer "testado" sem ter rodado. "Deveria passar" não é resultado.

## 6. Teste falhou

1. Leia a mensagem inteira. Não adivinhe.
2. Reproduza isolado (`fdescribe`/`fit` só localmente, nunca commitado; ou `npm run test:ci -- --include src/app/<caminho>.spec.ts`).
3. Corrija a **causa**. Se a correção é "ajustar o teste", volte ao item 5.
4. Rode a suíte inteira de novo. Verde parcial não existe.

## 7. Específico deste projeto

- Componente com dois temas: teste com `data-theme="dark"` no `<html>` quando a cor sai em arquivo, canvas ou exportação
  (precedente: E-001).
- Interface de dados mudou: o spec do modelo (`*.model.spec.ts`) cobre a validação, e `docs/mapeamento-de-dados.md`
  ganha o carimbo novo (R13).
- Texto visível novo: o spec confere o texto em pt-BR do glossário, não uma chave.
