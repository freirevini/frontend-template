import { isFarewellMessage } from './chat-farewell';

describe('isFarewellMessage', () => {
  it('recognizes a plain goodbye, with or without accents and punctuation', () => {
    ['tchau', 'Tchau!', 'obrigado', 'Muito obrigada pela ajuda', 'valeu, até mais', 'Até logo', 'ate logo', 'era só isso, obrigado', 'pode encerrar', 'fim', 'ok, só isso', 'Obrigado, Agente da Agenda!']
      .forEach(text => expect(isFarewellMessage(text)).withContext(text).toBeTrue());
  });

  it('treats anything with a question or other words as a message for the agent', () => {
    ['obrigado, e qual o prazo?', 'qual o fim da vigência?', 'até quando vale a resolução?', 'sim', 'ok', '', '   ', 'boa tarde',
      'obrigado obrigado obrigado obrigado obrigado obrigado obrigado obrigado obrigado']
      .forEach(text => expect(isFarewellMessage(text)).withContext(text).toBeFalse());
  });
});
