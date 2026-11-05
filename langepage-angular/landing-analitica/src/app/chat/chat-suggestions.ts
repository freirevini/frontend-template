import { Pipe, PipeTransform } from '@angular/core';

import { CHAT_TEXTS } from './chat-texts';
import { ChatMessage, ChatNode, ChatSuggestion } from './chat.model';

/**
 * Quick replies for the current step: the options of a menu, the ready answers (`quickReplies`) to a clarification on a
 * text step, "Recomeçar" at the end, "Voltar" when the step allows it and, once the user has taken part (`hasInteraction`),
 * "Encerrar" last (says goodbye, drops the session on the server and leaves the chat open). None while the agent is answering.
 */
export function buildChatSuggestions(
  node: ChatNode | null,
  busy: boolean,
  hasInteraction: boolean,
  replies: readonly string[] = []
): ChatSuggestion[] {
  if (!node || busy) {
    return [];
  }
  const suggestions: ChatSuggestion[] = [];
  if (node.type === 'menu') {
    suggestions.push(...(node.options ?? []).map(option => ({ kind: 'option' as const, label: option.label, option })));
  }
  if (node.type === 'free_text') {
    suggestions.push(...replies.map(label => ({ kind: 'reply' as const, label })));
  }
  if (node.type === 'end') {
    suggestions.push({ kind: 'restart', label: CHAT_TEXTS.restart });
  }
  if (node.canGoBack) {
    suggestions.push({ kind: 'back', label: CHAT_TEXTS.back });
  }
  if (hasInteraction && node.type !== 'end') {
    suggestions.push({ kind: 'end', label: CHAT_TEXTS.end });
  }
  return suggestions;
}

/** Ready answers of the last message, when it is the agent's (they stop applying once the user writes). */
export function lastQuickReplies(messages: readonly ChatMessage[]): string[] {
  const last = messages[messages.length - 1];
  return last?.role === 'ai' ? last.quickReplies ?? [] : [];
}

/**
 * `node | chatSuggestions : busy : hasInteraction : messages`. Pure, so the list keeps its identity until one of the
 * inputs changes.
 */
@Pipe({ name: 'chatSuggestions' })
export class ChatSuggestionsPipe implements PipeTransform {
  transform(node: ChatNode | null, busy: boolean, hasInteraction: boolean, messages: readonly ChatMessage[] = []): ChatSuggestion[] {
    return buildChatSuggestions(node, busy, hasInteraction, lastQuickReplies(messages));
  }
}
