import { ChatFlowMock } from './chat-mock-server';

let cached: Promise<ChatFlowMock> | undefined;

/** The shipped mock (src/assets/data/chat-fluxo-mock.json), as Karma serves it. Tests run against the real file. */
export function loadChatFlow(): Promise<ChatFlowMock> {
  cached ??= fetch('/assets/data/chat-fluxo-mock.json').then(response => response.json());
  return cached;
}

export const MB = 1024 * 1024;
export const pdfFile = (size = 1024, name = 'norma.pdf') => ({ name, size, type: 'application/pdf' });
