import { Component, Input } from '@angular/core';

import { loadErrorMessage, LoadErrorMessage } from './api-problem';
import { SUPPORT_CODE_TEXT } from './http-error-texts';

/** "Código de suporte: " (the part of SUPPORT_CODE_TEXT before the trace id). */
const SUPPORT_CODE_PREFIX = SUPPORT_CODE_TEXT.slice(0, SUPPORT_CODE_TEXT.indexOf('{traceId}'));

/**
 * Failure text of a data block, inside the block's own alert placeholder: the pt-BR text chosen by loadErrorMessage and,
 * when the BFF sent a trace id, "Código de suporte: …" on its own line with the value selectable for copying.
 */
@Component({
  selector: 'app-api-error-text',
  template: `
    @if (message.text) {
      {{ message.text }}
    }
    @if (message.supportCode) {
      <span class="api-error-support">{{ prefix }}<span class="user-select-all">{{ message.supportCode }}</span></span>
    }
  `,
  styles: ['.api-error-support { display: block; margin-top: .25rem; font-size: .875em; }']
})
export class ApiErrorTextComponent {
  /** The error the block received (ApiProblem from the interceptor, or anything thrown by a mock or an adapter). */
  @Input() error: unknown = null;
  /** The block's own sentence, e.g. "Não foi possível carregar a tabela analítica.". */
  @Input({ required: true }) fallback = '';

  readonly prefix = SUPPORT_CODE_PREFIX;

  get message(): LoadErrorMessage {
    return loadErrorMessage(this.error, this.fallback);
  }
}
