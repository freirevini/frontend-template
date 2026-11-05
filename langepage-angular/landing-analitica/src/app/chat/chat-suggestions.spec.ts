import { buildChatSuggestions, ChatSuggestionsPipe } from './chat-suggestions';
import { CHAT_TEXTS } from './chat-texts';
import { ChatNode } from './chat.model';

const MENU: ChatNode = { id: 'm', type: 'menu', prompt: '?', canGoBack: false, options: [{ id: 'a', label: 'Consultar uma norma' }, { id: 'b', label: 'Avaliar um documento' }] };
const TEXT: ChatNode = { id: 't', type: 'free_text', prompt: '?', canGoBack: true };
const UPLOAD: ChatNode = { id: 'u', type: 'upload', prompt: '?', canGoBack: true };
const END: ChatNode = { id: 'e', type: 'end', prompt: '?', canGoBack: false };

describe('buildChatSuggestions', () => {
  it('lists the options of a menu, in order, and no "Encerrar" before the user took part', () => {
    const list = buildChatSuggestions(MENU, false, false);
    expect(list.map(s => [s.kind, s.label])).toEqual([['option', 'Consultar uma norma'], ['option', 'Avaliar um documento']]);
    expect(list[0].option).toBe(MENU.options![0]);
  });

  it('puts "Voltar" and then "Encerrar" last, after the options of the step', () => {
    const list = buildChatSuggestions({ ...MENU, canGoBack: true }, false, true);
    expect(list.map(s => s.kind)).toEqual(['option', 'option', 'back', 'end']);
    expect(list[2].label).toBe(CHAT_TEXTS.back);
    expect(list[3].label).toBe(CHAT_TEXTS.end);
  });

  it('offers "Voltar" and "Encerrar" in text and upload steps', () => {
    expect(buildChatSuggestions(TEXT, false, true).map(s => s.kind)).toEqual(['back', 'end']);
    expect(buildChatSuggestions(UPLOAD, false, true).map(s => s.kind)).toEqual(['back', 'end']);
  });

  it('offers "Encerrar" in a menu that cannot go back, like the final question, once the user took part', () => {
    expect(buildChatSuggestions(MENU, false, true).map(s => s.kind)).toEqual(['option', 'option', 'end']);
  });

  it('offers only "Recomeçar" in the closed step (nothing to end any more)', () => {
    const list = buildChatSuggestions(END, false, true);
    expect(list.map(s => [s.kind, s.label])).toEqual([['restart', CHAT_TEXTS.restart]]);
  });

  it('offers nothing before the session starts, while the agent answers, or when the step has none', () => {
    expect(buildChatSuggestions(null, false, true)).toEqual([]);
    expect(buildChatSuggestions(MENU, true, true)).toEqual([]);
    expect(buildChatSuggestions({ ...TEXT, canGoBack: false }, false, false)).toEqual([]);
  });

  it('works as a pure pipe (same inputs, same list)', () => {
    const pipe = new ChatSuggestionsPipe();
    expect(pipe.transform(MENU, false, false).length).toBe(2);
    expect(pipe.transform(MENU, false, true).length).toBe(3);
    expect(pipe.transform(null, false, true)).toEqual([]);
  });
});
