/** Words that close the conversation on their own ("tchau", "obrigado", "pode encerrar"). Compared without accents. */
const CLOSING_WORDS = new Set([
  'tchau', 'tchauzinho', 'adeus', 'bye', 'obrigado', 'obrigada', 'obg', 'valeu', 'vlw', 'encerrar', 'encerra', 'encerre', 'sair', 'fim'
]);

/** Pairs that close the conversation together ("até logo", "só isso"). */
const CLOSING_PAIRS = ['ate logo', 'ate mais', 'ate breve', 'so isso'];

/** Words that may surround a goodbye without making it a question ("muito obrigado pela ajuda, tchau"). */
const FILLER_WORDS = new Set([
  'ate', 'logo', 'mais', 'breve', 'so', 'isso', 'muito', 'muita', 'pela', 'pelo', 'por', 'ajuda', 'tudo', 'ok', 'certo', 'entao',
  'e', 'era', 'pode', 'quero', 'gostaria', 'de', 'a', 'o', 'conversa', 'atendimento', 'chat', 'ja', 'agora', 'bom', 'dia', 'boa',
  'tarde', 'noite', 'assistente', 'agente', 'agenda', 'da', 'sim', 'beleza', 'blz'
]);

/** Longer texts are questions even when they start with a goodbye. */
const MAX_WORDS = 8;

/**
 * True when the whole message is a goodbye ("tchau", "obrigado, era só isso", "pode encerrar"). Any other word
 * ("obrigado, e qual o prazo?") makes it a question for the agent.
 */
export function isFarewellMessage(text: string): boolean {
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length || words.length > MAX_WORDS) {
    return false;
  }
  if (!words.every(word => CLOSING_WORDS.has(word) || FILLER_WORDS.has(word))) {
    return false;
  }
  const joined = words.join(' ');
  return words.some(word => CLOSING_WORDS.has(word)) || CLOSING_PAIRS.some(pair => ` ${joined} `.includes(` ${pair} `));
}
