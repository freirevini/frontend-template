import { Pipe, PipeTransform } from '@angular/core';

import { safeMarkdown } from './safe-markdown';

/** `[innerHTML]="text | safeMarkdown"`. Pure, so each message is formatted once. */
@Pipe({ name: 'safeMarkdown' })
export class SafeMarkdownPipe implements PipeTransform {
  transform(text: string | null | undefined): string {
    return safeMarkdown(text);
  }
}
