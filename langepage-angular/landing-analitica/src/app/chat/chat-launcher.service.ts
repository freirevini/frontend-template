import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/** A question another screen wants the assistant to answer; `null` only opens the panel. */
export type ChatLaunchRequest = { question: string | null };

/**
 * Lets any screen open the assistant or ask it something (e.g. a norm of the "Tabela Analítica") without depending on the
 * chat's HTTP services. The widget listens and does the rest.
 */
@Injectable({ providedIn: 'root' })
export class ChatLauncherService {
  private readonly subject = new Subject<ChatLaunchRequest>();
  readonly requests$: Observable<ChatLaunchRequest> = this.subject.asObservable();

  open(): void {
    this.subject.next({ question: null });
  }

  ask(question: string): void {
    const text = question.trim();
    if (text) {
      this.subject.next({ question: text });
    }
  }
}
