import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { ApiService } from './api.service';

/** `GET /v1/usuarios/me` (schema `UsuarioAtual`): only the first name; never login, e-mail or registration number. */
export interface UsuarioAtual {
  primeiroNome?: string;
}

/**
 * The signed-in user as far as the front needs it: the first name for the chat greeting (assumption S4 of ADR-023).
 * Kept in memory only (never in storage or logs). A failure or a missing field gives an empty name, never an error on
 * screen: the greeting then goes without a name.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private firstName?: string;

  constructor(private readonly api: ApiService) {}

  /** Raw first name ('' when unknown); the greeting filter (`greetingName`) still decides whether it is shown. */
  firstName$(): Observable<string> {
    if (this.firstName !== undefined) {
      return of(this.firstName);
    }
    return this.api.get<UsuarioAtual>('/usuarios/me').pipe(
      map(user => (typeof user?.primeiroNome === 'string' ? user.primeiroNome.trim() : '')),
      tap(name => (this.firstName = name)),
      catchError(() => of(''))
    );
  }
}
