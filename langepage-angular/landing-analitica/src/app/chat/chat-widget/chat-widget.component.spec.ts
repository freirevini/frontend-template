import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { IconSetService } from '@coreui/icons-angular';
import { of } from 'rxjs';

import { iconSubset } from '../../icons/icon-subset';
import { ChatApiService } from '../chat-api.service';
import { ChatLauncherService } from '../chat-launcher.service';
import { CHAT_TEXTS } from '../chat-texts';
import { ChatNode } from '../chat.model';
import { ChatWidgetComponent } from './chat-widget.component';

const MENU: ChatNode = {
  id: 'inicio', type: 'menu', prompt: 'O que você precisa?', canGoBack: false,
  options: [{ id: 'a', label: 'Consultar uma norma' }]
};
const TEXT: ChatNode = { id: 't', type: 'free_text', prompt: 'Descreva.', canGoBack: true, input: { enabled: true, maxChars: 1000 } };

describe('ChatWidgetComponent', () => {
  let fixture: ComponentFixture<ChatWidgetComponent>;
  let root: HTMLElement;
  let api: jasmine.SpyObj<ChatApiService>;

  const fab = () => root.querySelector<HTMLButtonElement>('.chat-fab')!;
  const panel = () => root.querySelector<HTMLElement>('#chat-panel')!;
  const isOpen = () => !panel().hidden;
  const button = (selector: string) => root.querySelector<HTMLButtonElement>(selector)!;
  const click = (el: HTMLElement) => {
    el.click();
    fixture.detectChanges();
  };
  /** Opens the panel and picks the first option, so the conversation has started and a text box exists. */
  const startConversation = () => {
    click(fab());
    click(button('.chat-chip'));
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ChatApiService>('ChatApiService', ['startSession', 'sendMessage', 'sendFiles', 'sendFeedback', 'endSession']);
    api.endSession.and.returnValue(of(undefined));
    api.startSession.and.returnValue(of({ sessionId: 's1', messages: [{ role: 'ai', text: 'Escolha.' }], node: MENU }));
    api.sendMessage.and.returnValue(of({ node: TEXT, messages: [{ role: 'ai', text: 'Descreva.' }] }));
    TestBed.configureTestingModule({ imports: [ChatWidgetComponent], providers: [IconSetService, { provide: ChatApiService, useValue: api }] });
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(ChatWidgetComponent);
    root = fixture.nativeElement;
    document.body.appendChild(root); // focus assertions need the element in the document
    fixture.detectChanges();
  });

  afterEach(() => root.remove());

  describe('opening', () => {
    it('starts hidden, with a labelled button that controls the panel', () => {
      expect(isOpen()).toBeFalse();
      expect(fab().getAttribute('aria-expanded')).toBe('false');
      expect(fab().getAttribute('aria-label')).toBe(CHAT_TEXTS.open);
      expect(fab().getAttribute('aria-controls')).toBe('chat-panel');
      expect(api.startSession).not.toHaveBeenCalled();
    });

    it('shows the agent\'s name beside the icon, with the last word in bold, inside the button\'s accessible name', () => {
      const name = fab().querySelector('.chat-fab__name')!;
      expect(name.textContent!.replace(/\s+/g, ' ').trim()).toBe('Agente da Agenda');
      expect(name.querySelector('strong')!.textContent).toBe('Agenda');
      expect(name.getAttribute('aria-hidden')).toBe('true');
      expect(fab().getAttribute('aria-label')).toContain(CHAT_TEXTS.agentName);
    });

    it('opens a labelled dialog and puts focus on the first suggestion', () => {
      click(fab());
      expect(isOpen()).toBeTrue();
      expect(panel().getAttribute('role')).toBe('dialog');
      expect(panel().getAttribute('aria-labelledby')).toBe('chat-title');
      expect(root.querySelector('#chat-title')!.textContent).toContain(CHAT_TEXTS.title);
      expect(fab().getAttribute('aria-expanded')).toBe('true');
      expect(fab().getAttribute('aria-label')).toBe(CHAT_TEXTS.minimize);
      expect(document.activeElement).toBe(root.querySelector('.chat-chip'));
    });

    it('starts the session on first open only and shows the conversation', () => {
      click(fab());
      expect(api.startSession).toHaveBeenCalledTimes(1);
      expect(root.querySelector('.chat-msg__text')!.textContent).toMatch(/^(Bom dia|Boa tarde|Boa noite)! Escolha./);
      click(fab()); // minimize
      click(fab()); // reopen
      expect(api.startSession).toHaveBeenCalledTimes(1);
    });

    it('has no usage notice', () => {
      click(fab());
      expect(root.querySelector('.chat-panel__notice')).toBeNull();
      expect(panel().textContent).not.toContain('Não envie dados pessoais');
    });
  });

  describe('minimizing and coming back', () => {
    it('minimizes with the header button and returns focus to the floating button', () => {
      click(fab());
      click(button('.chat-panel__minimize'));
      expect(isOpen()).toBeFalse();
      expect(document.activeElement).toBe(fab());
    });

    it('minimizes with Escape, but ignores it while already minimized', () => {
      click(fab());
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(isOpen()).toBeFalse();
      expect(document.activeElement).toBe(fab());
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(isOpen()).toBeFalse();
    });

    it('keeps the conversation, the draft text and the session, and focuses the text box on return', () => {
      startConversation();
      const area = root.querySelector<HTMLTextAreaElement>('textarea')!;
      area.value = 'rascunho da pergunta';
      area.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      click(button('.chat-panel__minimize'));
      expect(isOpen()).toBeFalse();
      click(fab());

      expect(isOpen()).toBeTrue();
      expect(api.startSession).toHaveBeenCalledTimes(1);
      expect(root.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('rascunho da pergunta');
      expect(root.querySelectorAll('.chat-msg--user').length).toBe(1);
      expect(document.activeElement).toBe(root.querySelector('textarea'));
    });

    it('marks the button while a conversation is running and the panel is minimized', () => {
      click(fab());
      expect(root.querySelector('.chat-fab__dot')).toBeNull();
      click(button('.chat-chip'));
      expect(root.querySelector('.chat-fab__dot')).toBeNull(); // open: no need for it

      click(button('.chat-panel__minimize'));
      expect(root.querySelector('.chat-fab__dot')).not.toBeNull();
      expect(fab().getAttribute('aria-label')).toBe(CHAT_TEXTS.openConversation);

      click(fab());
      expect(root.querySelector('.chat-fab__dot')).toBeNull();
    });

    it('does not mark the button when nothing was sent', () => {
      click(fab());
      click(button('.chat-panel__minimize'));
      expect(root.querySelector('.chat-fab__dot')).toBeNull();
      expect(fab().getAttribute('aria-label')).toBe(CHAT_TEXTS.open);
    });
  });

  describe('suggestions', () => {
    it('shows "Voltar" and "Encerrar" among the suggestions of the step and goes back when chosen', () => {
      startConversation(); // now on the text step
      const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.chat-suggestions .chat-chip'));
      expect(chips.map(c => c.textContent!.trim())).toEqual([CHAT_TEXTS.back, CHAT_TEXTS.end]);
      expect(root.querySelector('.chat-input')!.textContent).not.toContain(CHAT_TEXTS.back); // not under the text box

      api.sendMessage.and.returnValue(of({ node: MENU, messages: [{ role: 'ai', text: 'O que você precisa?' }] }));
      click(chips[0]);
      expect(api.sendMessage.calls.mostRecent().args[0].action).toBe('back');
      expect(Array.from(root.querySelectorAll('.chat-suggestions .chat-chip')).map(c => c.textContent!.trim())).toEqual(['Consultar uma norma', CHAT_TEXTS.end]);
    });

    it('offers "Recomeçar" at the end of the process', () => {
      const END: ChatNode = { id: 'fim', type: 'end', prompt: 'Mais algo?', canGoBack: false };
      startConversation();
      api.sendMessage.and.returnValue(of({ node: END, messages: [{ role: 'ai', text: 'Mais algo?' }] }));
      const input = root.querySelector<HTMLTextAreaElement>('textarea')!;
      input.value = 'pergunta';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      fixture.detectChanges();
      expect(Array.from(root.querySelectorAll('.chat-suggestions .chat-chip')).map(c => c.textContent!.trim())).toEqual([CHAT_TEXTS.restart]);
      expect(root.querySelector('.chat-input')).toBeNull();
    });
  });

  describe('clarification', () => {
    it('shows the ready answers as suggestions and sends the chosen one as text', () => {
      startConversation();
      api.sendMessage.and.returnValue(
        of({ node: TEXT, messages: [{ role: 'ai', status: 'need_more_info', text: 'Qual norma?', questions: ['Qual?'], quickReplies: ['Resolução 1', 'Circular 2'] }] })
      );
      const textarea = root.querySelector<HTMLTextAreaElement>('textarea')!;
      textarea.value = 'prazo';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      click(button('.chat-send'));
      const chips = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.chat-chip')).map(chip => chip.textContent!.trim());
      expect(chips().slice(0, 2)).toEqual(['Resolução 1', 'Circular 2']);

      click(root.querySelectorAll<HTMLButtonElement>('.chat-chip')[1]);
      expect(api.sendMessage.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ action: 'text', text: 'Circular 2' }));
    });
  });

  describe('paste on the upload step', () => {
    it('sends an image pasted anywhere in the panel', () => {
      const UPLOAD: ChatNode = {
        id: 'u', type: 'upload', prompt: 'Envie.', canGoBack: true,
        upload: { accept: ['.pdf', '.png'], maxBytes: 20 * 1024 * 1024, maxFiles: 5 }
      };
      api.sendMessage.and.returnValue(of({ node: UPLOAD, messages: [{ role: 'ai', text: 'Envie.' }] }));
      api.sendFiles.and.returnValue(of({ node: UPLOAD, messages: [], files: [{ id: 'f', accepted: true }] }));
      startConversation();
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(20)], 'image.png', { type: 'image/png' }));
      panel().dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
      fixture.detectChanges();
      const sent = api.sendFiles.calls.mostRecent().args[2] as File[];
      expect(sent.length).toBe(1);
      expect(sent[0].name).toMatch(/^imagem-colada-/);
    });
  });

  describe('opened from other screens', () => {
    it('opens the panel and asks the question', () => {
      TestBed.inject(ChatLauncherService).ask('Qual o prazo da Resolução 1?');
      fixture.detectChanges();
      expect(isOpen()).toBeTrue();
      expect(api.sendMessage).toHaveBeenCalledOnceWith(jasmine.objectContaining({ action: 'ask', text: 'Qual o prazo da Resolução 1?' }));
      expect(root.textContent).toContain('Qual o prazo da Resolução 1?');
    });

    it('only opens the panel when there is no question', () => {
      TestBed.inject(ChatLauncherService).open();
      fixture.detectChanges();
      expect(isOpen()).toBeTrue();
      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it('stops listening once destroyed', () => {
      fixture.destroy();
      TestBed.inject(ChatLauncherService).ask('pergunta');
      expect(api.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('feedback', () => {
    it('rates an answer from the panel and thanks the user', () => {
      api.sendFeedback.and.returnValue(of(undefined));
      api.sendMessage.and.returnValue(
        of({ node: TEXT, messages: [{ role: 'ai', status: 'answer', text: 'Resposta', citations: [{ sourceId: 'mock-1', excerpt: 'x' }] }] })
      );
      startConversation();
      click(button('.chat-feedback__button'));
      expect(api.sendFeedback).toHaveBeenCalledWith({ sessionId: 's1', rating: 'useful', sourceIds: ['mock-1'] });
      expect(root.querySelector('.chat-feedback [role=status]')!.textContent).toContain(CHAT_TEXTS.feedbackThanks);
    });
  });

  describe('expanding', () => {
    it('widens and narrows the panel from the header, with a label that follows the state', () => {
      click(fab());
      const expand = () => button('.chat-panel__expand');
      expect(panel().classList).not.toContain('chat-panel--wide');
      expect(expand().getAttribute('aria-label')).toBe(CHAT_TEXTS.expand);

      click(expand());
      expect(panel().classList).toContain('chat-panel--wide');
      expect(expand().getAttribute('aria-label')).toBe(CHAT_TEXTS.collapse);

      click(expand());
      expect(panel().classList).not.toContain('chat-panel--wide');
    });

    it('stays expanded after minimizing and reopening', () => {
      click(fab());
      click(button('.chat-panel__expand'));
      click(button('.chat-panel__minimize'));
      click(fab());
      expect(panel().classList).toContain('chat-panel--wide');
    });
  });

  describe('end ("Encerrar")', () => {
    const chips = () => Array.from(root.querySelectorAll('.chat-suggestions .chat-chip')).map(c => c.textContent!.trim());
    const finish = () => {
      startConversation();
      click(button('.chat-chip--end'));
      tick(25 * 100); // the goodbye is typed word by word
      fixture.detectChanges();
    };

    it('shows "Encerrar" right after "Voltar" once the user took part, not before', () => {
      click(fab());
      expect(chips()).not.toContain(CHAT_TEXTS.end); // fresh menu: nothing to end yet
      click(button('.chat-chip'));
      expect(chips()).toEqual([CHAT_TEXTS.back, CHAT_TEXTS.end]);
    });

    it('says goodbye but leaves the chat open, with the conversation still there', fakeAsync(() => {
      finish();
      const texts = Array.from(root.querySelectorAll('.chat-msg__text')).map(el => el.textContent);
      expect(texts[texts.length - 1]).toContain('Até logo');
      expect(texts.length).toBeGreaterThan(3); // the history was kept
      expect(isOpen()).toBeTrue(); // not minimized: that is up to the user
      expect(fab().getAttribute('aria-expanded')).toBe('true');
      expect(chips()).toEqual([CHAT_TEXTS.restart]);
      expect(root.querySelector('.chat-input')).toBeNull();
    }));

    it('drops the session on the server and does not start another one', fakeAsync(() => {
      finish();
      expect(api.endSession).toHaveBeenCalledWith('s1');
      click(button('.chat-panel__minimize'));
      click(fab()); // coming back
      expect(api.startSession).toHaveBeenCalledTimes(1);
      expect(chips()).toEqual([CHAT_TEXTS.restart]);
    }));

    it('"Recomeçar" after it opens a fresh conversation', fakeAsync(() => {
      finish();
      click(button('.chat-suggestions .chat-chip'));
      expect(api.startSession).toHaveBeenCalledTimes(2);
      expect(root.querySelectorAll('.chat-msg--user').length).toBe(0);
    }));
  });

  describe('restart', () => {
    it('is disabled until the user sends something', () => {
      click(fab());
      const restart = button('.chat-panel__restart');
      expect(restart.textContent).toContain(CHAT_TEXTS.restart);
      expect(restart.disabled).toBeTrue();
    });

    it('is enabled after any interaction and starts over', () => {
      startConversation();
      const restart = button('.chat-panel__restart');
      expect(restart.disabled).toBeFalse();

      click(restart);
      expect(api.endSession).toHaveBeenCalledWith('s1');
      expect(api.startSession).toHaveBeenCalledTimes(2);
      expect(button('.chat-panel__restart').disabled).toBeTrue(); // new conversation: nothing sent yet
    });

    it('is enabled by "Voltar" too', () => {
      startConversation();
      click(button('.chat-panel__restart')); // back to a clean menu
      expect(button('.chat-panel__restart').disabled).toBeTrue();
      api.sendMessage.and.returnValues(of({ node: TEXT, messages: [] }), of({ node: MENU, messages: [] }));
      click(button('.chat-chip'));
      click(button('.chat-chip--back'));
      expect(button('.chat-panel__restart').disabled).toBeFalse();
    });
  });
});
