import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { fileProblemText, namePastedFile, validateChatFiles } from '../chat-file';
import { CHAT_TEXTS } from '../chat-texts';
import { CHAT_LIMITS, ChatNode } from '../chat.model';
import { DecimalPipe } from '@angular/common';
import { IconDirective } from '@coreui/icons-angular';

const MAX_TEXTAREA_HEIGHT_PX = 120;

/** Where the user writes or attaches a document. Options, "Voltar" and "Recomeçar" are suggestions in the conversation. */
@Component({
    selector: 'app-chat-input',
    templateUrl: './chat-input.component.html',
    imports: [ReactiveFormsModule, IconDirective, DecimalPipe]
})
export class ChatInputComponent implements OnChanges, AfterViewChecked {
  @Input() node: ChatNode | null = null;
  /** True while the agent answers: options and sending are blocked and "Parar" replaces "Enviar". */
  @Input() sending = false;
  /** Bytes of documents already sent in this conversation (limit: CHAT_LIMITS.maxSessionBytes). */
  @Input() usedBytes = 0;

  @Output() textSend = new EventEmitter<string>();
  /** Documents that passed the checks, sent together (chosen in the picker or pasted). */
  @Output() filesSend = new EventEmitter<File[]>();
  @Output() stop = new EventEmitter<void>();

  @ViewChild('textarea') private textarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('actionButton') private actionButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly texts = CHAT_TEXTS;
  readonly text = new FormControl('', { nonNullable: true });
  /** One line per document that could not go ("nome: motivo"). */
  fileErrors: string[] = [];

  private focusPending = false;

  get maxChars(): number {
    return this.node?.input?.maxChars ?? CHAT_LIMITS.maxInputChars;
  }

  get count(): number {
    return this.text.value.length;
  }

  get canSend(): boolean {
    const length = this.text.value.trim().length;
    return !this.sending && length > 0 && this.count <= this.maxChars;
  }

  /** Steps with something to type or attach; the others show only suggestions in the conversation. */
  get hasInput(): boolean {
    return this.node?.type === 'free_text' || this.node?.type === 'upload';
  }

  get accept(): string {
    return (this.node?.upload?.accept ?? []).join(',');
  }

  get multiple(): boolean {
    return (this.node?.upload?.maxFiles ?? 1) > 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node']) {
      this.text.reset('');
      this.fileErrors = [];
      this.focusPending = true;
    }
  }

  /** Puts focus where the next action is (the text box or the first option) once the new step is rendered. */
  ngAfterViewChecked(): void {
    if (!this.focusPending) {
      return;
    }
    this.focusPending = false;
    (this.textarea ?? this.actionButtons?.first)?.nativeElement.focus();
  }

  /** Focuses the text box (or the first action). Returns false when there is nothing to focus yet. */
  focus(): boolean {
    const target = this.textarea ?? this.actionButtons?.first;
    target?.nativeElement.focus();
    return !!target;
  }

  send(): void {
    if (!this.canSend) {
      return;
    }
    this.textSend.emit(this.text.value.trim());
    this.text.reset('');
    this.autoGrow();
  }

  onKeydown(event: KeyboardEvent): void {
    // Enter sends, Shift+Enter breaks the line; Enter while an input method is composing must not send.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
    }
  }

  autoGrow(): void {
    const el = this.textarea?.nativeElement;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
    }
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // lets the same file be chosen again after a refusal
    this.submit(files);
  }

  /**
   * Ctrl+V on the upload step: a print copied to the clipboard (or files copied in the Windows Explorer) is sent like a
   * chosen file. The widget forwards the panel's paste events here; anywhere else, or with nothing to paste, it does nothing.
   */
  onPaste(event: ClipboardEvent): void {
    if (this.node?.type !== 'upload' || this.sending) {
      return;
    }
    const files = Array.from(event.clipboardData?.files ?? []);
    if (!files.length) {
      return;
    }
    event.preventDefault();
    const now = new Date();
    this.submit(files.map(file => namePastedFile(file, now)));
  }

  private submit(files: File[]): void {
    if (!files.length || !this.node?.upload) {
      return;
    }
    const check = validateChatFiles(files, this.node.upload, this.usedBytes);
    this.fileErrors = check.problems.map(item => `${item.name}: ${fileProblemText(item.problem)}`);
    if (check.valid.length) {
      this.filesSend.emit(check.valid);
    }
  }
}
