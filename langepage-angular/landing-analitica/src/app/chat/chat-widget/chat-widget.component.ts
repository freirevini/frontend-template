import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { ChatInputComponent } from '../chat-input/chat-input.component';
import { ChatLauncherService } from '../chat-launcher.service';
import { ChatMessagesComponent } from '../chat-messages/chat-messages.component';
import { ChatSessionService } from '../chat-session.service';
import { CHAT_TEXTS } from '../chat-texts';
import { ChatSuggestion } from '../chat.model';
import { AsyncPipe } from '@angular/common';
import { IconDirective } from '@coreui/icons-angular';
import { ChatSuggestionsPipe } from '../chat-suggestions';

/**
 * Floating button + panel; the conversation lives in ChatSessionService. Minimizing only hides the panel (the DOM stays),
 * so messages, the draft text and the session survive until the user comes back. Other screens open it or ask it
 * something through ChatLauncherService.
 */
@Component({
    selector: 'app-chat-widget',
    templateUrl: './chat-widget.component.html',
    imports: [IconDirective, ChatMessagesComponent, ChatInputComponent, AsyncPipe, ChatSuggestionsPipe]
})
export class ChatWidgetComponent implements OnDestroy {
  readonly texts = CHAT_TEXTS;
  readonly state$ = this.session.state$;
  /** Name beside the button's icon in two weights, like the brand ("Agente da" regular, "Agenda" bold). */
  readonly nameLead = CHAT_TEXTS.agentName.slice(0, CHAT_TEXTS.agentName.lastIndexOf(' '));
  readonly nameTail = CHAT_TEXTS.agentName.slice(CHAT_TEXTS.agentName.lastIndexOf(' ') + 1);
  open = false;
  /** Wider panel (still floating). Kept in memory only; it survives minimizing. */
  expanded = false;

  @ViewChild('fab') private fab?: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;
  @ViewChild(ChatInputComponent) input?: ChatInputComponent;
  @ViewChild(ChatMessagesComponent) private messages?: ChatMessagesComponent;

  private readonly launches: Subscription;

  constructor(
    readonly session: ChatSessionService,
    private readonly changeDetector: ChangeDetectorRef,
    launcher: ChatLauncherService
  ) {
    this.launches = launcher.requests$.subscribe(request => {
      if (!this.open) {
        this.show();
      }
      if (request.question) {
        this.session.ask(request.question);
      }
    });
  }

  ngOnDestroy(): void {
    this.launches.unsubscribe();
  }

  fabLabel(hasInteraction: boolean): string {
    if (this.open) {
      return this.texts.minimize;
    }
    return hasInteraction ? this.texts.openConversation : this.texts.open;
  }

  toggle(): void {
    if (this.open) {
      this.minimize();
    } else {
      this.show();
    }
  }

  /** Opens the panel (first time: starts the session) and puts the reader back at the end of the conversation. */
  show(): void {
    this.open = true;
    this.session.start();
    this.changeDetector.detectChanges(); // the panel must be visible before it can take focus or scroll
    this.messages?.scrollToEnd(false);
    if (!this.input?.focus() && !this.messages?.focusSuggestion()) {
      this.panel?.nativeElement.focus();
    }
  }

  minimize(): void {
    this.open = false;
    // The button may be hidden while the panel is open (small screens): render it before focusing.
    this.changeDetector.detectChanges();
    this.fab?.nativeElement.focus();
  }

  onSuggestion(suggestion: ChatSuggestion): void {
    if (suggestion.kind === 'option' && suggestion.option) {
      this.session.pickOption(suggestion.option);
    } else if (suggestion.kind === 'reply') {
      this.session.sendText(suggestion.label);
    } else if (suggestion.kind === 'back') {
      this.session.back();
    } else if (suggestion.kind === 'end') {
      this.session.end(); // says goodbye and leaves the panel open: minimizing is the user's choice
    } else if (suggestion.kind === 'restart') {
      this.session.restart();
    }
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.minimize();
    }
  }
}
