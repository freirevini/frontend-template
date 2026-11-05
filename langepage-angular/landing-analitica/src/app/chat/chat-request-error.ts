import { ChatErrorCode } from './chat.model';

/** Failure of a chat request, the same shape whether it came from the BFF or from the mock. */
export class ChatRequestError extends Error {
  /** `traceId` of the BFF's Problem Details, shown as "código de suporte" (never the server message). */
  constructor(readonly code: ChatErrorCode, readonly status: number, readonly traceId?: string) {
    super(code);
    this.name = 'ChatRequestError';
  }
}
