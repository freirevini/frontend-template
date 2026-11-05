import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IconSetService } from '@coreui/icons-angular';

import { iconSubset } from '../../icons/icon-subset';
import { CHAT_ERROR_TEXTS, CHAT_TEXTS } from '../chat-texts';
import { CHAT_LIMITS, ChatNode } from '../chat.model';
import { ChatInputComponent } from './chat-input.component';

const MENU: ChatNode = {
  id: 'inicio', type: 'menu', prompt: 'O que você precisa?', canGoBack: false,
  options: [{ id: 'a', label: 'Consultar uma norma' }, { id: 'b', label: 'Avaliar um documento' }]
};
const TEXT: ChatNode = { id: 't', type: 'free_text', prompt: 'Dúvida?', canGoBack: true, input: { enabled: true, placeholder: 'Pergunte aqui', maxChars: 20 } };
const UPLOAD: ChatNode = {
  id: 'u', type: 'upload', prompt: 'Envie.', canGoBack: true,
  upload: { accept: ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'], maxBytes: CHAT_LIMITS.maxSessionBytes, maxFiles: 3 }
};
const END: ChatNode = { id: 'fim', type: 'end', prompt: 'Mais algo?', canGoBack: false };

@Component({
    template: `<app-chat-input [node]="node" [sending]="sending" [usedBytes]="usedBytes"
    (textSend)="texts.push($event)" (filesSend)="received($event)" (stop)="stops = stops + 1"></app-chat-input>`,
    imports: [ChatInputComponent]
})
class HostComponent {
  node: ChatNode | null = MENU;
  sending = false;
  usedBytes = 0;
  texts: string[] = [];
  files: File[] = [];
  sends = 0;
  stops = 0;

  received(files: File[]): void {
    this.files.push(...files);
    this.sends++;
  }
}

describe('ChatInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let root: HTMLElement;

  const q = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const show = (node: ChatNode | null) => {
    host.node = node;
    fixture.detectChanges();
  };
  const type = (value: string) => {
    const area = q<HTMLTextAreaElement>('textarea')!;
    area.value = value;
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const press = (key: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });
    q('textarea')!.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };
  const choose = (...picked: File[]) => {
    const input = q<HTMLInputElement>('input[type=file]')!;
    const transfer = new DataTransfer();
    picked.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const pdf = (size = 1024, name = 'norma.pdf', type = 'application/pdf') => new File([new Uint8Array(size)], name, { type });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [IconSetService] });
    TestBed.inject(IconSetService).icons = { ...iconSubset };
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    root = fixture.nativeElement;
    document.body.appendChild(root); // focus assertions need the element in the document
    fixture.detectChanges();
  });

  afterEach(() => root.remove());

  it('renders nothing without a node', () => {
    show(null);
    expect(q('.chat-input')).toBeNull();
  });

  describe('steps without a text box', () => {
    it('renders nothing for a menu or the end (their options are suggestions in the conversation)', () => {
      expect(q('.chat-input')).toBeNull();
      show(END);
      expect(q('.chat-input')).toBeNull();
    });

    it('focus() reports false when there is nothing to focus', () => {
      const input = fixture.debugElement.query(el => el.name === 'app-chat-input').componentInstance;
      expect(input.focus()).toBeFalse();
    });
  });

  describe('free text', () => {
    beforeEach(() => show(TEXT));

    it('labels the text box, uses the node placeholder and focuses it', () => {
      const area = q<HTMLTextAreaElement>('textarea')!;
      expect(area.placeholder).toBe('Pergunte aqui');
      expect(root.querySelector('label[for=chat-text]')!.textContent).toContain(CHAT_TEXTS.inputLabel);
      expect(area.getAttribute('maxlength')).toBe('20');
      expect(document.activeElement).toBe(area);
    });

    it('keeps "Enviar" disabled for empty or blank text', () => {
      const send = q<HTMLButtonElement>('.chat-send')!;
      expect(send.disabled).toBeTrue();
      type('   ');
      expect(send.disabled).toBeTrue();
      type('olá');
      expect(send.disabled).toBeFalse();
    });

    it('sends the trimmed text on Enter and clears the box', () => {
      type('  qual o prazo?  ');
      const event = press('Enter');
      expect(event.defaultPrevented).toBeTrue();
      expect(host.texts).toEqual(['qual o prazo?']);
      expect(q<HTMLTextAreaElement>('textarea')!.value).toBe('');
    });

    it('does not send on Shift+Enter or while composing', () => {
      type('linha');
      expect(press('Enter', { shiftKey: true }).defaultPrevented).toBeFalse();
      press('Enter', { isComposing: true });
      expect(host.texts).toEqual([]);
    });

    it('sends with the button', () => {
      type('pergunta');
      q<HTMLButtonElement>('.chat-send')!.click();
      expect(host.texts).toEqual(['pergunta']);
    });

    it('refuses to send above the limit', () => {
      type('x'.repeat(25)); // a value set by script can exceed maxlength
      expect(q<HTMLButtonElement>('.chat-send')!.disabled).toBeTrue();
      press('Enter');
      expect(host.texts).toEqual([]);
    });

    it('shows the character counter and flags the limit', () => {
      type('abc');
      expect(q('.chat-count')!.textContent).toMatch(/3\s*\/\s*20/);
      expect(q('.chat-count')!.classList).not.toContain('is-limit');
      type('x'.repeat(20));
      expect(q('.chat-count')!.classList).toContain('is-limit');
    });

    it('falls back to the default limit when the node has none', () => {
      show({ ...TEXT, id: 't2', input: { enabled: true } });
      expect(q('textarea')!.getAttribute('maxlength')).toBe(String(CHAT_LIMITS.maxInputChars));
    });

    it('swaps "Enviar" for "Parar" while sending, and Parar emits stop', () => {
      type('oi');
      host.sending = true;
      fixture.detectChanges();
      expect(q('[aria-label="Enviar"]')).toBeNull();
      q<HTMLButtonElement>(`[aria-label="${CHAT_TEXTS.stop}"]`)!.click();
      expect(host.stops).toBe(1);
      expect(host.texts).toEqual([]);
    });

    it('focus() puts the cursor in the text box', () => {
      (document.activeElement as HTMLElement).blur();
      const input = fixture.debugElement.query(el => el.name === 'app-chat-input').componentInstance;
      expect(input.focus()).toBeTrue();
      expect(document.activeElement).toBe(q('textarea'));
    });

    it('has no "Voltar" button here (it is a suggestion in the conversation)', () => {
      expect(root.textContent).not.toContain(CHAT_TEXTS.back);
    });

    it('clears the draft when the step changes', () => {
      type('rascunho');
      show({ ...TEXT, id: 'outro' });
      expect(q<HTMLTextAreaElement>('textarea')!.value).toBe('');
    });
  });

  describe('upload', () => {
    beforeEach(() => show(UPLOAD));

    it('focuses the attach button when the step appears', () => {
      expect(document.activeElement).toBe(q('.chat-option'));
    });

    it('offers the attach button, the accepted types and the hint', () => {
      expect(q('.chat-option')!.textContent).toContain(CHAT_TEXTS.attach);
      expect(q<HTMLInputElement>('input[type=file]')!.accept).toBe('.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp');
      expect(q<HTMLInputElement>('input[type=file]')!.multiple).toBeTrue();
      expect(q('.chat-input__hint')!.textContent).toBe(`${CHAT_TEXTS.uploadHint} ${CHAT_TEXTS.pasteHint}`);
      expect(q('textarea')).toBeNull();
    });

    it('emits a valid document and shows no error', () => {
      const file = pdf();
      choose(file);
      expect(host.files).toEqual([file]);
      expect(q('[role=alert]')).toBeNull();
    });

    it('refuses an unsupported type with a message', () => {
      choose(pdf(10, 'programa.exe', 'application/x-msdownload'));
      expect(host.files).toEqual([]);
      expect(q('[role=alert]')!.textContent!.trim()).toBe(`programa.exe: ${CHAT_ERROR_TEXTS.FILE_TYPE_NOT_ALLOWED}`);
    });

    it('refuses an empty file', () => {
      choose(pdf(0));
      expect(q('[role=alert]')!.textContent!.trim()).toBe(`norma.pdf: ${CHAT_TEXTS.fileEmpty}`);
    });

    it('refuses a file that passes the 20 MB of the conversation', () => {
      host.usedBytes = CHAT_LIMITS.maxSessionBytes - 100;
      fixture.detectChanges();
      choose(pdf(200));
      expect(host.files).toEqual([]);
      expect(q('[role=alert]')!.textContent!.trim()).toBe(`norma.pdf: ${CHAT_ERROR_TEXTS.SESSION_QUOTA_EXCEEDED}`);
    });

    it('refuses what passes the 9 MB of one send and still sends the rest', () => {
      const MB = 1024 * 1024;
      choose(pdf(5 * MB, 'a.pdf'), pdf(5 * MB, 'b.pdf'));
      expect(host.files.map(file => file.name)).toEqual(['a.pdf']);
      expect(q('[role=alert]')!.textContent!.trim()).toBe(`b.pdf: ${CHAT_ERROR_TEXTS.SEND_TOO_LARGE}`);
    });

    it('clears a previous error after a valid document', () => {
      choose(pdf(0));
      expect(q('[role=alert]')).not.toBeNull();
      choose(pdf());
      expect(q('[role=alert]')).toBeNull();
    });

    it('sends several PDFs and Word documents together, in one emission', () => {
      const docx = pdf(500, 'circular.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const doc = pdf(500, 'antiga.doc', '');
      choose(pdf(), docx, doc);
      expect(host.sends).toBe(1);
      expect(host.files.map(file => file.name)).toEqual(['norma.pdf', 'circular.docx', 'antiga.doc']);
    });

    it('sends the valid ones and lists the others, one line each, including those past the per-send limit', () => {
      choose(pdf(10, 'a.exe', ''), pdf(), pdf(1, 'b.pdf'), pdf(1, 'c.pdf'), pdf(1, 'd.pdf'));
      expect(host.files.map(file => file.name)).toEqual(['norma.pdf', 'b.pdf', 'c.pdf']);
      const lines = Array.from(root.querySelectorAll('[role=alert] li')).map(li => li.textContent!.trim());
      expect(lines).toEqual([`a.exe: ${CHAT_ERROR_TEXTS.FILE_TYPE_NOT_ALLOWED}`, `d.pdf: ${CHAT_TEXTS.fileTooMany}`]);
    });

    describe('paste (Ctrl+V)', () => {
      const paste = (...files: File[]) => {
        const transfer = new DataTransfer();
        files.forEach(file => transfer.items.add(file));
        const event = new ClipboardEvent('paste', { clipboardData: transfer, cancelable: true, bubbles: true });
        fixture.debugElement.query(By.directive(ChatInputComponent)).componentInstance.onPaste(event);
        fixture.detectChanges();
        return event;
      };

      it('sends a copied print with a readable name', () => {
        const event = paste(new File([new Uint8Array(50)], 'image.png', { type: 'image/png' }));
        expect(event.defaultPrevented).toBeTrue();
        expect(host.files.length).toBe(1);
        expect(host.files[0].name).toMatch(/^imagem-colada-\d{2}h\d{2}m\d{2}s\.png$/);
        expect(host.files[0].type).toBe('image/png');
      });

      it('sends files copied in the Explorer with their own names', () => {
        paste(pdf(10, 'resolucao.pdf'));
        expect(host.files.map(file => file.name)).toEqual(['resolucao.pdf']);
      });

      it('leaves text pastes alone and ignores pastes outside the upload step or while sending', () => {
        expect(paste().defaultPrevented).toBeFalse();
        host.sending = true;
        fixture.detectChanges();
        paste(pdf());
        show(TEXT);
        paste(pdf());
        expect(host.files).toEqual([]);
      });
    });

    it('does nothing when the dialog is dismissed without a file', () => {
      choose();
      expect(host.files).toEqual([]);
      expect(q('[role=alert]')).toBeNull();
    });
  });
});
