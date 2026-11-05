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

import { downloadXlsx, XlsxTable } from '../../core/export/xlsx-export';
import { fileResultCells, fileResultsXlsxTable } from '../chat-file-results';
import { formatFileSize, isEmail, prefersReducedMotion } from '../chat-format';
import { formatNormDate, normListTitle, normListXlsxTable } from '../chat-norms-export';
import { CHAT_SUPPORT_CODE_LABEL, CHAT_TEXTS } from '../chat-texts';
import { ChatFeedbackRating, ChatMessage, ChatNormItem, ChatSuggestion, canRateMessage } from '../chat.model';

import { IconDirective } from '@coreui/icons-angular';
import { SafeMarkdownPipe } from '../markdown/safe-markdown.pipe';

/** Distance from the bottom (px) under which the list keeps following new messages. */
const NEAR_BOTTOM_PX = 80;

/**
 * Message list: bubbles by role with the author's name (and the assistant's icon) at the start of each run, markdown
 * through `safeMarkdown`, norm lists filterable by segment (as a list or, with more than one norm, a table that can be
 * exported to Excel), citations, questions, contacts, typing dots.
 */
@Component({
    selector: 'app-chat-messages',
    templateUrl: './chat-messages.component.html',
    imports: [IconDirective, SafeMarkdownPipe]
})
export class ChatMessagesComponent implements OnChanges, AfterViewChecked {
  @Input() messages: ChatMessage[] = [];
  /** Shows the "typing" bubble while the agent answers. */
  @Input() typing = false;
  /** Offers "Tentar novamente" under a last message that failed. */
  @Input() retryable = false;
  /** Quick replies shown after the last message (options of the step, "Voltar", "Recomeçar"). */
  @Input() suggestions: ChatSuggestion[] = [];
  /** The step has no text box, so the first suggestion takes focus when the suggestions change. */
  @Input() focusSuggestions = false;
  @Output() suggestionPick = new EventEmitter<ChatSuggestion>();
  @Output() retry = new EventEmitter<void>();
  @Output() rate = new EventEmitter<{ message: ChatMessage; rating: ChatFeedbackRating }>();

  @ViewChild('log', { static: true }) private log!: ElementRef<HTMLElement>;
  @ViewChildren('chip') private chips!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly texts = CHAT_TEXTS;
  /** "Código de suporte: " before the trace id of a failed request (only the id is selected on a triple click). */
  readonly supportCodeLabel = CHAT_SUPPORT_CODE_LABEL;
  readonly formatFileSize = formatFileSize;
  readonly isEmail = isEmail;
  readonly canRate = canRateMessage;
  showScrollButton = false;
  /** Segment chosen in each message's norm list (absent = all). Kept on screen only. */
  segmentFilter: Record<string, string | undefined> = {};
  /** Messages whose norm list is shown as a table. Kept on screen only. */
  tableView: Record<string, boolean> = {};
  /** Messages whose Excel file is being built, or whose last export failed. */
  exporting: Record<string, boolean> = {};
  exportFailed: Record<string, boolean> = {};
  readonly formatNormDate = formatNormDate;
  readonly normListTitle = normListTitle;
  readonly fileCells = fileResultCells;
  /** Swappable in tests; builds and downloads the file in the browser (exceljs, R9). */
  download = downloadXlsx;

  private nearBottom = true;
  private pendingScroll = false;
  private focusPending = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['suggestions']) {
      this.focusPending = this.focusSuggestions && this.suggestions.length > 0;
    }
    if (changes['messages'] || changes['typing'] || changes['suggestions']) {
      const last = this.messages[this.messages.length - 1];
      // Follow the conversation unless the user scrolled up to read; their own message always scrolls.
      this.pendingScroll = this.nearBottom || last?.role === 'user';
    }
  }

  ngAfterViewChecked(): void {
    if (this.focusPending && this.chips.first) {
      this.focusPending = false;
      this.chips.first.nativeElement.focus();
    }
    if (this.pendingScroll) {
      this.pendingScroll = false;
      this.scrollToEnd(false);
    }
  }

  /** Focuses the first suggestion. Returns false when there is none. */
  focusSuggestion(): boolean {
    const first = this.chips?.first;
    first?.nativeElement.focus();
    return !!first;
  }

  onScroll(): void {
    const el = this.log.nativeElement;
    this.nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
    this.showScrollButton = !this.nearBottom;
  }

  scrollToEnd(smooth = true): void {
    const el = this.log.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
  }

  get showRetry(): boolean {
    return this.retryable && this.messages[this.messages.length - 1]?.status === 'error';
  }

  /** Name (and icon) only on the first of consecutive messages by the same author; system notes have none. */
  startsGroup(index: number): boolean {
    const message = this.messages[index];
    return message.role !== 'system' && this.messages[index - 1]?.role !== message.role;
  }

  segmentsOf(message: ChatMessage): string[] {
    const segments = (message.normList?.items ?? []).map(item => item.segment).filter((segment): segment is string => !!segment);
    return [...new Set(segments)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  visibleNorms(message: ChatMessage): ChatNormItem[] {
    const segment = this.segmentFilter[message.id];
    const items = message.normList?.items ?? [];
    return segment ? items.filter(item => item.segment === segment) : items;
  }

  filterSegment(messageId: string, segment: string | null): void {
    this.segmentFilter = { ...this.segmentFilter, [messageId]: segment ?? undefined };
  }

  /** "Ver em formato tabela" only makes sense with more than one norm. */
  canShowTable(message: ChatMessage): boolean {
    return (message.normList?.items.length ?? 0) > 1;
  }

  toggleTable(messageId: string): void {
    this.tableView = { ...this.tableView, [messageId]: !this.tableView[messageId] };
  }

  /** Exports the norms shown in the table (segment filter applied) to an .xlsx file. */
  exportNorms(message: ChatMessage): Promise<void> {
    return this.export(message.id, () => normListXlsxTable(message, this.visibleNorms(message), this.segmentFilter[message.id], new Date()));
  }

  /** Exports the evaluation of several documents (one row per document) to an .xlsx file. */
  exportFileResults(message: ChatMessage): Promise<void> {
    return this.export(`${message.id}:files`, () => fileResultsXlsxTable(message.fileResults ?? [], new Date()));
  }

  private async export(key: string, table: () => XlsxTable): Promise<void> {
    if (this.exporting[key]) {
      return;
    }
    this.exporting = { ...this.exporting, [key]: true };
    this.exportFailed = { ...this.exportFailed, [key]: false };
    try {
      await this.download(table());
    } catch (error) {
      console.error('[chat] xlsx export failed', error);
      this.exportFailed = { ...this.exportFailed, [key]: true };
    } finally {
      this.exporting = { ...this.exporting, [key]: false };
    }
  }

  author(message: ChatMessage): string {
    return message.role === 'user' ? this.texts.userName : message.role === 'ai' ? this.texts.agentName : '';
  }

  trackById(_: number, message: ChatMessage): string {
    return message.id;
  }
}
