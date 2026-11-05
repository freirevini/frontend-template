import { CHAT_TEXTS } from './chat-texts';
import { ChatApiMessage, ChatUser } from './chat.model';

/** Start of the afternoon and of the evening (local hour, 0–23). Before 5h it is still night ("Boa noite"). */
const AFTERNOON_FROM = 12;
const EVENING_FROM = 18;
const MORNING_FROM = 5;
const MAX_NAME_CHARS = 40;

/** "Bom dia" (5h–11h), "Boa tarde" (12h–17h) or "Boa noite" (18h–4h), by the clock of the user's computer. */
export function timeOfDayGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour >= MORNING_FROM && hour < AFTERNOON_FROM) {
    return CHAT_TEXTS.goodMorning;
  }
  return hour >= AFTERNOON_FROM && hour < EVENING_FROM ? CHAT_TEXTS.goodAfternoon : CHAT_TEXTS.goodEvening;
}

/**
 * First name fit for a greeting: first word, letters only (accents, hyphen and apostrophe allowed), capitalized
 * ("VINICIUS FREIRE" → "Vinicius"). Anything that looks like a login ("DOMINIO\\vfreire", "vinicius.silva", "x123") gives
 * an empty name, so the greeting never shows a technical id.
 */
export function greetingName(raw: string | undefined): string {
  const first = (raw ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first || first.length > MAX_NAME_CHARS || !/^\p{L}+(?:['’-]\p{L}+)*$/u.test(first)) {
    return '';
  }
  return first
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|['’-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase('pt-BR'));
}

/** "Boa tarde, Vinicius!" or, without a usable name, "Boa tarde!". */
export function buildGreeting(user: ChatUser | undefined, now: Date): string {
  const name = greetingName(user?.firstName);
  return `${timeOfDayGreeting(now)}${name ? `, ${name}` : ''}!`;
}

/**
 * Puts the greeting at the start of the first lasting agent message of the welcome ("Boa tarde, Vinicius! Sou o Agente
 * da Agenda…"); if there is none, the greeting becomes a message of its own. The BFF's welcome never greets by itself.
 */
export function withGreeting(messages: ChatApiMessage[], greeting: string): ChatApiMessage[] {
  const index = messages.findIndex(message => message.role === 'ai' && !message.transient && !!message.text);
  if (index < 0) {
    return [{ role: 'ai', text: greeting }, ...messages];
  }
  return messages.map((message, i) => (i === index ? { ...message, text: `${greeting} ${message.text}` } : message));
}
