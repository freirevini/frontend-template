import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { supportCodeText } from '../../core/http/http-error-texts';
import { CHAT_ERROR_TEXTS, CHAT_TEXTS } from '../chat-texts';
import { ChatMessage, ChatSuggestion } from '../chat.model';
import { ChatMessagesComponent } from './chat-messages.component';

const msg = (id: string, over: Partial<ChatMessage> = {}): ChatMessage => ({ id, role: 'ai', createdAt: new Date(2026, 9, 28), ...over });

@Component({
    template: '<div style="height: 120px; display: flex"><app-chat-messages [messages]="messages" [typing]="typing" [retryable]="retryable" (retry)="retries = retries + 1" (rate)="rated.push($event)" [suggestions]="suggestions" [focusSuggestions]="focusSuggestions" (suggestionPick)="picked.push($event)"></app-chat-messages></div>',
    imports: [ChatMessagesComponent]
})
class HostComponent {
  messages: ChatMessage[] = [];
  typing = false;
  retryable = false;
  retries = 0;
  rated: { message: ChatMessage; rating: string }[] = [];
  suggestions: ChatSuggestion[] = [];
  focusSuggestions = false;
  picked: ChatSuggestion[] = [];
}

describe('ChatMessagesComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let root: HTMLElement;

  const log = () => root.querySelector<HTMLElement>('.chat-log')!;
  const render = (messages: ChatMessage[], typing = false) => {
    host.messages = messages;
    host.typing = typing;
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    root = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('is an accessible live log', () => {
    expect(log().getAttribute('role')).toBe('log');
    expect(log().getAttribute('aria-live')).toBe('polite');
    expect(log().getAttribute('aria-label')).toBe(CHAT_TEXTS.messagesLabel);
  });

  it('renders one article per message with the role class and the author\'s name', () => {
    render([msg('1', { role: 'ai', text: 'olá' }), msg('2', { role: 'user', text: 'oi' }), msg('3', { role: 'system', text: 'aviso' })]);
    const items = root.querySelectorAll('article.chat-msg');
    expect(items.length).toBe(3);
    expect(items[0].classList).toContain('chat-msg--ai');
    expect(items[1].classList).toContain('chat-msg--user');
    expect(items[2].classList).toContain('chat-msg--system');
    expect(items[0].querySelector('.chat-msg__author')!.textContent!.trim()).toBe(CHAT_TEXTS.agentName);
    expect(items[1].querySelector('.chat-msg__author')!.textContent!.trim()).toBe(CHAT_TEXTS.userName);
    expect(items[2].querySelector('.chat-msg__author, .visually-hidden')).toBeNull();
  });

  it('shows the name (and the assistant\'s icon) only at the start of a run; later messages keep a hidden name', () => {
    render([msg('1', { text: 'a' }), msg('2', { text: 'b' }), msg('3', { role: 'user', text: 'c' }), msg('4', { role: 'user', text: 'd' })]);
    const items = root.querySelectorAll('article.chat-msg');
    expect(items[0].querySelector('.chat-msg__avatar')).not.toBeNull();
    expect(items[1].querySelector('.chat-msg__author')).toBeNull();
    expect(items[1].querySelector('.visually-hidden')!.textContent).toContain(CHAT_TEXTS.agentName);
    expect(items[2].querySelector('.chat-msg__author')).not.toBeNull();
    expect(items[2].querySelector('.chat-msg__avatar')).toBeNull();
    expect(items[3].querySelector('.chat-msg__author')).toBeNull();
  });

  describe('norm list', () => {
    const list = msg('1', {
      text: 'Normas a classificar:',
      normList: {
        dateLabel: 'Vigência',
        items: [
          { id: 'a', title: 'Resolução A', detail: 'Pendente', segment: 'Varejo', date: '2027-03-01' },
          { id: 'b', title: 'Circular B', segment: 'Atacado', date: '2027-07-01' },
          { id: 'c', title: 'Instrução C', segment: 'Varejo' }
        ]
      }
    });
    const titles = () => Array.from(root.querySelectorAll('.chat-norms__title')).map(el => el.textContent);
    const segments = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.chat-norms__segment'));

    it('lists each norm with its note, segment and date in dd/mm/aaaa', () => {
      render([list]);
      expect(titles()).toEqual(['Resolução A', 'Circular B', 'Instrução C']);
      const first = root.querySelector('.chat-norms__item')!.textContent!.replace(/\s+/g, ' ');
      expect(first).toContain('Pendente');
      expect(first).toContain('Varejo · Vigência 01/03/2027');
    });

    it('filters by segment with toggle buttons, "Todos" first', () => {
      render([list]);
      expect(root.querySelector('.chat-norms__filter')!.getAttribute('aria-label')).toBe(CHAT_TEXTS.normsFilter);
      expect(segments().map(button => button.textContent!.trim())).toEqual([CHAT_TEXTS.normsAll, 'Atacado', 'Varejo']);
      expect(segments()[0].getAttribute('aria-pressed')).toBe('true');

      segments()[2].click();
      fixture.detectChanges();
      expect(titles()).toEqual(['Resolução A', 'Instrução C']);
      expect(segments()[2].getAttribute('aria-pressed')).toBe('true');
      expect(segments()[0].getAttribute('aria-pressed')).toBe('false');

      segments()[0].click();
      fixture.detectChanges();
      expect(titles().length).toBe(3);
    });

    describe('table view and Excel', () => {
      const actions = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.chat-norms__action'));
      const component = () => fixture.debugElement.query(By.directive(ChatMessagesComponent)).componentInstance as ChatMessagesComponent;
      const showTable = () => {
        render([list]);
        actions()[0].click();
        fixture.detectChanges();
      };

      it('offers "Ver em formato tabela" when there is more than one norm, and no Excel in the list view', () => {
        render([list]);
        expect(actions().map(button => button.textContent!.trim())).toEqual([CHAT_TEXTS.normsShowTable]);
        expect(root.querySelector('.chat-norms__table')).toBeNull();
      });

      it('does not offer the table for a single norm', () => {
        render([msg('1', { normList: { items: [{ id: 'a', title: 'A' }] } })]);
        expect(actions().length).toBe(0);
      });

      it('shows the norms as a table with the list date as a column, then goes back to the list', () => {
        showTable();
        const headers = Array.from(root.querySelectorAll('.chat-norms__table th')).map(cell => cell.textContent!.trim());
        expect(headers).toEqual(['Norma', 'Observação', 'Segmento', 'Vigência']);
        const firstRow = Array.from(root.querySelectorAll('.chat-norms__table tbody tr')[0].children).map(cell => cell.textContent!.trim());
        expect(firstRow).toEqual(['Resolução A', 'Pendente', 'Varejo', '01/03/2027']);
        expect(root.querySelector('.chat-norms__table caption')!.textContent).toContain('Normas a classificar');
        expect(actions()[0].getAttribute('aria-pressed')).toBe('true');
        expect(actions().map(button => button.textContent!.trim())).toEqual([CHAT_TEXTS.normsShowList, CHAT_TEXTS.normsExport]);

        actions()[0].click();
        fixture.detectChanges();
        expect(root.querySelector('.chat-norms__table')).toBeNull();
        expect(titles().length).toBe(3);
      });

      it('keeps the segment filter in the table', () => {
        showTable();
        segments()[1].click();
        fixture.detectChanges();
        expect(root.querySelectorAll('.chat-norms__table tbody tr').length).toBe(1);
      });

      it('exports the rows on screen to Excel, with the filter', async () => {
        showTable();
        segments()[2].click();
        fixture.detectChanges();
        const download = jasmine.createSpy('download').and.resolveTo();
        component().download = download;
        actions()[1].click();
        await fixture.whenStable();
        const table = download.calls.mostRecent().args[0];
        expect(table.rows.map((row: { title: string }) => row.title)).toEqual(['Resolução A', 'Instrução C']);
        expect(table.fileName).toMatch(/^agente-da-agenda-normas-a-classificar-varejo-\d{4}-\d{2}-\d{2}\.xlsx$/);
        fixture.detectChanges();
        expect(actions()[1].disabled).toBeFalse();
        expect(root.querySelector('[role="alert"]')).toBeNull();
      });

      it('says so when the file cannot be built', async () => {
        showTable();
        spyOn(console, 'error');
        component().download = jasmine.createSpy('download').and.rejectWith(new Error('boom'));
        actions()[1].click();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(root.querySelector('[role="alert"]')!.textContent).toContain(CHAT_TEXTS.normsExportFailed);
      });
    });

    it('has no filter when every norm is in the same segment', () => {
      render([msg('1', { normList: { items: [{ id: 'a', title: 'A', segment: 'Varejo' }, { id: 'b', title: 'B', segment: 'Varejo' }] } })]);
      expect(root.querySelector('.chat-norms__filter')).toBeNull();
    });
  });

  it('formats markdown but never renders raw HTML from the message', () => {
    render([msg('1', { text: '**forte** <img src=x onerror="window.__chatXss=1"><script>window.__chatXss=1</script>' })]);
    const text = root.querySelector('.chat-msg__text')!;
    expect(text.querySelector('strong')!.textContent).toBe('forte');
    expect(text.querySelector('img')).toBeNull();
    expect(text.querySelector('script')).toBeNull();
    expect(text.textContent).toContain('<img');
    expect((window as unknown as Record<string, unknown>)['__chatXss']).toBeUndefined();
  });

  it('shows the status styles', () => {
    render([
      msg('1', { status: 'answer', text: 'a' }),
      msg('2', { status: 'need_more_info', text: 'b' }),
      msg('3', { status: 'out_of_scope', text: 'c' }),
      msg('4', { status: 'not_in_data', text: 'd' }),
      msg('5', { status: 'error', text: 'e' })
    ]);
    const classes = Array.from(root.querySelectorAll('article.chat-msg')).map(el => el.className);
    expect(classes[0]).toContain('chat-msg--answer');
    expect(classes[1]).toContain('chat-msg--clarify');
    expect(classes[2]).toContain('chat-msg--notice');
    expect(classes[3]).toContain('chat-msg--notice');
    expect(classes[4]).toContain('chat-msg--error');
  });

  it('lists clarification questions, sources and contacts', () => {
    render([
      msg('1', {
        text: 'x',
        questions: ['Qual norma?'],
        citations: [{ sourceId: 'mock-0001', excerpt: 'Art. 5º prazo de 180 dias' }],
        contacts: [
          { name: 'Compliance', area: 'Normas', channel: 'contato@compliance.com.br' },
          { name: 'Plantão', area: 'Normas', channel: 'ramal 1234' }
        ]
      })
    ]);
    const content = root.textContent!;
    expect(content).toContain(CHAT_TEXTS.clarify);
    expect(content).toContain('Qual norma?');
    expect(content).toContain(CHAT_TEXTS.sources);
    expect(content).toContain('mock-0001');
    expect(content).toContain('Art. 5º prazo de 180 dias');
    expect(content).toContain(CHAT_TEXTS.contacts);
    const links = root.querySelectorAll<HTMLAnchorElement>('.chat-msg__contacts a');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('mailto:contato@compliance.com.br');
    expect(root.querySelector('.chat-msg__contacts')!.textContent).toContain('ramal 1234');
  });

  it('shows each attached file with size and verdict', () => {
    render([msg('1', { role: 'user', files: [{ name: 'norma.pdf', sizeBytes: 1_572_864, accepted: false }, { name: 'b.docx', sizeBytes: 10 }] })]);
    const files = root.querySelectorAll('.chat-msg__file');
    expect(files.length).toBe(2);
    expect(files[0].textContent).toContain('norma.pdf');
    expect(files[0].textContent).toContain('1,5 MB');
    expect(files[0].textContent).toContain(CHAT_TEXTS.fileRejected);
    expect(files[1].textContent).not.toContain(CHAT_TEXTS.fileAccepted);
  });

  it('shows "Verificando o documento..." on a file in quarantine, inside the live log, then its verdict', () => {
    const user = (files: ChatMessage['files']) => msg('1', { role: 'user', files });
    render([user([{ name: 'norma.pdf', sizeBytes: 2048, checking: true }])]);
    const file = () => root.querySelector('.chat-msg__file')!;
    expect(file().closest('[aria-live=polite]')).toBe(log()); // the change is announced by the log
    expect(file().querySelector('.chat-msg__file-checking')!.textContent!.trim()).toBe(CHAT_TEXTS.fileChecking);
    expect(file().textContent).not.toContain(CHAT_TEXTS.fileAccepted);

    render([user([{ name: 'norma.pdf', sizeBytes: 2048, accepted: true }])]);
    expect(file().querySelector('.chat-msg__file-checking')).toBeNull();
    expect(file().textContent).toContain(CHAT_TEXTS.fileAccepted);
  });

  it('shows the quarantine reason under a refused file', () => {
    render([msg('1', { role: 'user', files: [{ name: 'a.pdf', sizeBytes: 10, accepted: false, reason: CHAT_ERROR_TEXTS.FILE_CHECK_FAILED }] })]);
    expect(root.querySelector('.chat-msg__file')!.textContent).toContain(CHAT_TEXTS.fileRejected);
    expect(root.querySelector('.chat-msg__file-reason')!.textContent!.trim()).toBe(CHAT_ERROR_TEXTS.FILE_CHECK_FAILED);
  });

  it('shows "Código de suporte" with the selectable trace id under an error, only when there is one', () => {
    render([msg('1', { status: 'error', text: CHAT_ERROR_TEXTS.SEND_TOO_LARGE, supportCode: '4bf92f3577b34da6' }), msg('2', { status: 'error', text: 'x' })]);
    const supports = root.querySelectorAll('.chat-msg__support');
    expect(supports.length).toBe(1);
    expect(supports[0].textContent!.trim()).toBe(supportCodeText('4bf92f3577b34da6'));
    expect(supports[0].closest('.chat-msg--error')).not.toBeNull();
    expect(root.querySelector('.chat-msg__support-code')!.textContent).toBe('4bf92f3577b34da6');
  });

  describe('results of several documents', () => {
    const results = msg('1', {
      text: 'Avaliei 2 documentos.',
      fileResults: [
        { name: 'res.pdf', sizeBytes: 100, result: { id: 'a', accepted: true, metadata: { normIdentifier: 'Resolução 1', documentKind: 'norma_integral' } } },
        { name: 'contrato.docx', sizeBytes: 200, result: { id: 'b', accepted: false, reason: 'Não é norma.' } }
      ]
    });
    const quarantined = msg('2', {
      text: 'Avaliei 2 documentos.',
      fileResults: [
        { name: 'res.pdf', sizeBytes: 100, result: { id: 'a', accepted: true } },
        { name: 'virus.pdf', sizeBytes: 200, result: { id: 'b', accepted: false, quarantine: 'FILE_REJECTED_UNSAFE', reason: CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE } }
      ]
    });
    const component = () => fixture.debugElement.query(By.directive(ChatMessagesComponent)).componentInstance as ChatMessagesComponent;
    const rows = () => Array.from(root.querySelectorAll('.chat-norms__table tbody tr')).map(row => Array.from(row.children).map(cell => cell.textContent!.trim()));

    it('shows a table with file, verdict, norm found and note', () => {
      render([results]);
      expect(Array.from(root.querySelectorAll('.chat-norms__table th')).map(th => th.textContent!.trim()))
        .toEqual(['Arquivo', 'Resultado', 'Norma identificada', 'Observação']);
      expect(rows()).toEqual([
        ['res.pdf', CHAT_TEXTS.fileAccepted, 'Resolução 1', 'Norma completa'],
        ['contrato.docx', CHAT_TEXTS.fileRejected, '', 'Não é norma.']
      ]);
    });

    it('marks a document barred in quarantine as refused in the security check, with its reason', () => {
      render([quarantined]);
      expect(rows()[1]).toEqual(['virus.pdf', CHAT_TEXTS.fileQuarantined, '', CHAT_ERROR_TEXTS.FILE_REJECTED_UNSAFE]);
    });

    it('exports the results to Excel', async () => {
      render([results]);
      const download = jasmine.createSpy('download').and.resolveTo();
      component().download = download;
      root.querySelector<HTMLButtonElement>('.chat-norms__action')!.click();
      await fixture.whenStable();
      const table = download.calls.mostRecent().args[0];
      expect(table.rows.length).toBe(2);
      expect(table.fileName).toMatch(/^agente-da-agenda-avaliacao-documentos-\d{4}-\d{2}-\d{2}\.xlsx$/);
    });
  });

  it('shows a labelled typing indicator only while typing', () => {
    render([msg('1', { text: 'a' })]);
    expect(root.querySelector('.chat-msg--typing')).toBeNull();
    render([msg('1', { text: 'a' })], true);
    const typing = root.querySelector('.chat-msg--typing')!;
    expect(typing.getAttribute('role')).toBe('status');
    expect(typing.textContent).toContain(CHAT_TEXTS.typing);
    expect(typing.querySelectorAll('.chat-dot').length).toBe(3);
  });

  it('offers "Tentar novamente" only under a last message that failed and can be repeated', () => {
    const failed = [msg('1', { text: 'x' }), msg('2', { status: 'error', text: 'falhou' })];
    render(failed);
    expect(root.querySelector('.chat-retry')).toBeNull(); // not retryable

    host.retryable = true;
    render(failed);
    const button = root.querySelector<HTMLButtonElement>('.chat-retry')!;
    expect(button.textContent).toContain(CHAT_TEXTS.retry);
    button.click();
    expect(host.retries).toBe(1);

    render([msg('2', { status: 'error', text: 'falhou' }), msg('3', { text: 'depois' })]);
    expect(root.querySelector('.chat-retry')).toBeNull();
  });

  describe('suggestions', () => {
    const options: ChatSuggestion[] = [
      { kind: 'option', label: 'Consultar uma norma', option: { id: 'a', label: 'Consultar uma norma' } },
      { kind: 'back', label: 'Voltar' }
    ];
    const chips = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.chat-chip'));

    it('shows nothing without suggestions', () => {
      render([msg('1', { text: 'oi' })]);
      expect(root.querySelector('.chat-suggestions')).toBeNull();
    });

    it('shows them inside the conversation, after the last message, in a labelled group', () => {
      host.suggestions = options;
      render([msg('1', { text: 'O que você precisa?' })]);
      const group = root.querySelector('.chat-suggestions')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe(CHAT_TEXTS.suggestions);
      expect(log().contains(group)).toBeTrue();
      expect(log().lastElementChild).toBe(group);
      expect(chips().map(c => c.textContent!.trim())).toEqual(['Consultar uma norma', 'Voltar']);
    });

    it('marks "Voltar" as the secondary suggestion, with an arrow', () => {
      host.suggestions = options;
      render([msg('1', { text: 'x' })]);
      expect(chips()[0].classList).not.toContain('chat-chip--back');
      expect(chips()[1].classList).toContain('chat-chip--back');
      expect(chips()[1].querySelector('svg')).not.toBeNull();
    });

    it('emits the chosen suggestion', () => {
      host.suggestions = options;
      render([msg('1', { text: 'x' })]);
      chips()[1].click();
      expect(host.picked).toEqual([options[1]]);
    });

    it('puts focus on the first suggestion only when the step has no text box', () => {
      document.body.appendChild(root);
      host.focusSuggestions = true;
      host.suggestions = options;
      render([msg('1', { text: 'x' })]);
      expect(document.activeElement).toBe(chips()[0]);

      (document.activeElement as HTMLElement).blur();
      host.focusSuggestions = false;
      host.suggestions = [options[1]];
      render([msg('1', { text: 'x' })]);
      expect(document.activeElement).not.toBe(chips()[0]);
      root.remove();
    });

    it('follows the conversation to the end when they appear', () => {
      const many = Array.from({ length: 30 }, (_, i) => msg(`m${i}`, { text: `mensagem ${i}` }));
      render(many);
      host.suggestions = options;
      render(many);
      expect(log().scrollHeight - log().scrollTop - log().clientHeight).toBeLessThan(2);
    });
  });

  describe('feedback', () => {
    const answer = msg('a', { status: 'answer', text: 'Resposta' });
    const groups = () => root.querySelectorAll('.chat-feedback');

    it('offers "Útil" and "Não útil" under answers and "not found", in a labelled group', () => {
      render([answer, msg('b', { status: 'not_in_data', text: 'Sem dados' })]);
      expect(groups().length).toBe(2);
      expect(groups()[0].getAttribute('role')).toBe('group');
      expect(groups()[0].getAttribute('aria-label')).toBe(CHAT_TEXTS.feedbackQuestion);
      const labels = Array.from(groups()[0].querySelectorAll('button')).map(b => b.textContent!.trim());
      expect(labels).toEqual([CHAT_TEXTS.feedbackUseful, CHAT_TEXTS.feedbackNotUseful]);
    });

    it('does not offer it on other messages', () => {
      render([
        msg('1', { text: 'oi' }),
        msg('2', { role: 'user', status: 'answer', text: 'x' }),
        msg('3', { status: 'out_of_scope', text: 'x' }),
        msg('4', { status: 'need_more_info', text: 'x' }),
        msg('5', { status: 'error', text: 'x' }),
        msg('6', { status: 'not_in_data', text: 'x', contacts: [{ name: 'a', area: 'b', channel: 'c' }] })
      ]);
      expect(groups().length).toBe(0);
    });

    it('emits the message and the rating', () => {
      render([answer]);
      const [useful, notUseful] = Array.from(groups()[0].querySelectorAll('button'));
      useful.click();
      notUseful.click();
      expect(host.rated.map(r => r.rating)).toEqual(['useful', 'not_useful']);
      expect(host.rated[0].message.id).toBe('a');
    });

    it('swaps the buttons for a thanks note once rated', () => {
      render([{ ...answer, feedback: 'useful' }]);
      expect(groups()[0].querySelectorAll('button').length).toBe(0);
      expect(groups()[0].querySelector('[role=status]')!.textContent).toContain(CHAT_TEXTS.feedbackThanks);
    });

    it('shows an alert when sending failed and keeps the buttons', () => {
      render([{ ...answer, feedbackError: true }]);
      expect(groups()[0].querySelector('[role=alert]')!.textContent).toContain(CHAT_TEXTS.feedbackFailed);
      expect(groups()[0].querySelectorAll('button').length).toBe(2);
    });
  });

  describe('scrolling', () => {
    const many = (count: number) => Array.from({ length: count }, (_, i) => msg(`m${i}`, { text: `mensagem ${i}` }));
    const scrollUp = () => {
      log().scrollTop = 0;
      log().dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
    };

    it('follows new messages while the reader is at the bottom', () => {
      render(many(30));
      const el = log();
      expect(el.scrollHeight).toBeGreaterThan(el.clientHeight);
      expect(el.scrollHeight - el.scrollTop - el.clientHeight).toBeLessThan(2);
      render(many(31));
      expect(el.scrollHeight - el.scrollTop - el.clientHeight).toBeLessThan(2);
    });

    it('shows "Ir para o fim" after scrolling up and hides it back at the bottom', () => {
      render(many(30));
      expect(root.querySelector('.chat-scroll-end')).toBeNull();
      scrollUp();
      const button = root.querySelector<HTMLButtonElement>('.chat-scroll-end')!;
      expect(button.textContent).toContain(CHAT_TEXTS.scrollToEnd);
      button.click();
      log().scrollTop = log().scrollHeight;
      log().dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      expect(root.querySelector('.chat-scroll-end')).toBeNull();
    });

    it('does not pull the reader down for an agent message, but does for their own', () => {
      render(many(30));
      scrollUp();
      render(many(31));
      expect(log().scrollTop).toBe(0);
      render([...many(31), msg('mine', { role: 'user', text: 'oi' })]);
      expect(log().scrollHeight - log().scrollTop - log().clientHeight).toBeLessThan(2);
    });
  });

  it('is a real component (standalone, imported by its host)', () => {
    expect(root.querySelector('app-chat-messages')).not.toBeNull();
    expect(ChatMessagesComponent).toBeDefined();
  });
});
