import { Component, inject } from '@angular/core';

import { LOGIN_AGAIN_LABEL, SESSION_EXPIRED_TEXT } from './http-error-texts';
import { LoginRedirectService } from './login-redirect.service';

/**
 * Page notice for a 401 that the loop breaker of LoginRedirectService did not turn into a redirect: the pt-BR text and a
 * plain link to sign in again (full-page navigation, same return parameter as the automatic redirect).
 */
@Component({
  selector: 'app-session-expired-notice',
  template: `
    @if (login.manualLoginUrl(); as url) {
      <div class="alert alert-warning d-flex flex-wrap align-items-center gap-2 mb-4" role="alert">
        <span>{{ text }}</span>
        <a class="alert-link" [href]="url" (click)="login.rememberManualLogin()">{{ label }}</a>
      </div>
    }
  `
})
export class SessionExpiredNoticeComponent {
  readonly login = inject(LoginRedirectService);
  readonly text = SESSION_EXPIRED_TEXT;
  readonly label = LOGIN_AGAIN_LABEL;
}
