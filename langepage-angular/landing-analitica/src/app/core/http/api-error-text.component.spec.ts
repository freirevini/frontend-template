import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiErrorTextComponent } from './api-error-text.component';
import { ApiProblem, loadErrorMessage } from './api-problem';
import { HTTP_ERROR_TEXTS } from './http-error-texts';

const FALLBACK = 'Não foi possível carregar a tabela analítica.';

describe('loadErrorMessage', () => {
  it('keeps the block sentence for a generic failure and for anything that is not an ApiProblem', () => {
    expect(loadErrorMessage(new ApiProblem(500, 'SIS-003'), FALLBACK)).toEqual({ text: FALLBACK, supportCode: null });
    expect(loadErrorMessage(new ApiProblem(503, 'SIS-001', 'abc-1'), FALLBACK)).toEqual({ text: FALLBACK, supportCode: 'abc-1' });
    expect(loadErrorMessage(new Error('Norma X has an unknown segment'), FALLBACK)).toEqual({ text: FALLBACK, supportCode: null });
  });

  it('uses the specific pt-BR text of the status, and nothing at all for 401', () => {
    expect(loadErrorMessage(new ApiProblem(403, 'AUT-002', 't1'), FALLBACK)).toEqual({ text: HTTP_ERROR_TEXTS.forbidden, supportCode: 't1' });
    expect(loadErrorMessage(new ApiProblem(400, 'VAL-005'), FALLBACK).text).toBe(HTTP_ERROR_TEXTS.badRequest);
    expect(loadErrorMessage(new ApiProblem(504), FALLBACK).text).toBe(HTTP_ERROR_TEXTS.timeout);
    expect(loadErrorMessage(new ApiProblem(0), FALLBACK).text).toBe(HTTP_ERROR_TEXTS.network);
    expect(loadErrorMessage(new ApiProblem(401, 'AUT-001', 't2'), FALLBACK)).toEqual({ text: null, supportCode: null });
  });
});

@Component({
  imports: [ApiErrorTextComponent],
  template: `<div role="alert"><app-api-error-text [error]="error" [fallback]="fallback"></app-api-error-text></div>`
})
class HostComponent {
  error: unknown = null;
  fallback = FALLBACK;
}

describe('ApiErrorTextComponent', () => {
  const render = (error: unknown) => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(HostComponent);
    fixture.componentInstance.error = error;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the text and the support code on its own line, value selectable, never the server message', () => {
    const root = render(new ApiProblem(503, 'SIS-001', '4bf92f3577b34da6'));
    expect(root.textContent).toContain(FALLBACK);
    const support = root.querySelector('.api-error-support');
    expect(support?.textContent).toBe('Código de suporte: 4bf92f3577b34da6');
    expect(support?.querySelector('.user-select-all')?.textContent).toBe('4bf92f3577b34da6');
  });

  it('has no support line without a trace id and shows nothing on 401', () => {
    expect(render(new Error('x')).querySelector('.api-error-support')).toBeNull();
    TestBed.resetTestingModule();
    expect((render(new ApiProblem(401, 'AUT-001', 'abc')).textContent ?? '').trim()).toBe('');
  });
});
