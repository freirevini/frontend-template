import { CHAT_ERROR_TEXTS, CHAT_TEXTS } from './chat-texts';
import { CHAT_LIMITS, ChatErrorCode, ChatUploadConfig } from './chat.model';

export type ChatFileProblem = ChatErrorCode | 'FILE_EMPTY' | 'TOO_MANY_FILES';

/** Documents that can go and the ones that cannot, with why (in the order the user chose them). */
export interface ChatFileCheck {
  valid: File[];
  problems: { name: string; problem: ChatFileProblem }[];
}

/**
 * Checks a document before sending. The BFF repeats every check (it never trusts the browser);
 * this only saves a round trip. Returns the first problem found, or null.
 */
export function validateChatFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
  upload: ChatUploadConfig,
  usedBytes: number
): ChatFileProblem | null {
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!upload.accept.includes(extension)) {
    return 'FILE_TYPE_NOT_ALLOWED';
  }
  // `type` is empty for some systems; when the browser reports one it must be allowed too.
  if (file.type && !(CHAT_LIMITS.allowedMimeTypes as readonly string[]).includes(file.type)) {
    return 'FILE_TYPE_NOT_ALLOWED';
  }
  if (file.size === 0) {
    return 'FILE_EMPTY';
  }
  if (file.size > upload.maxBytes) {
    return 'FILE_TOO_LARGE';
  }
  if (usedBytes + file.size > CHAT_LIMITS.maxSessionBytes) {
    return 'SESSION_QUOTA_EXCEEDED';
  }
  return null;
}

/**
 * Checks several documents chosen or pasted together: each one as `validateChatFile` (its size capped by the per-send
 * limit too), the session quota summed over the ones already accepted in this batch, at most `upload.maxFiles` (capped
 * by CHAT_LIMITS.maxFilesPerSend) and at most CHAT_LIMITS.maxSendBytes summed per send (D4: the gateway takes ~10 MB
 * per request). A document that would pass the sum stays out with SEND_TOO_LARGE; the next, smaller ones may still go.
 */
export function validateChatFiles(files: File[], upload: ChatUploadConfig, usedBytes: number): ChatFileCheck {
  const limit = Math.min(upload.maxFiles, CHAT_LIMITS.maxFilesPerSend);
  const sendLimit = sendLimitOf(upload);
  const perFile: ChatUploadConfig = { ...upload, maxBytes: Math.min(upload.maxBytes, sendLimit) };
  const check: ChatFileCheck = { valid: [], problems: [] };
  let bytes = usedBytes;
  let sendBytes = 0;
  files.forEach(file => {
    let problem: ChatFileProblem | null = check.valid.length >= limit ? 'TOO_MANY_FILES' : validateChatFile(file, perFile, bytes);
    if (!problem && sendBytes + file.size > sendLimit) {
      problem = 'SEND_TOO_LARGE';
    }
    if (problem) {
      check.problems.push({ name: file.name, problem });
    } else {
      check.valid.push(file);
      bytes += file.size;
      sendBytes += file.size;
    }
  });
  return check;
}

/** Sum allowed for one send: the step's `maxSendBytes`, never above CHAT_LIMITS.maxSendBytes. */
export function sendLimitOf(upload: ChatUploadConfig): number {
  return Math.min(upload.maxSendBytes ?? CHAT_LIMITS.maxSendBytes, CHAT_LIMITS.maxSendBytes);
}

/**
 * A pasted image gets a readable name with the time ("imagem-colada-14h05m33s.png"); clipboards name every image
 * "image.png". Files pasted from the Windows Explorer keep their own name.
 */
export function namePastedFile(file: File, now: Date): File {
  if (!file.type.startsWith('image/') || !/^image\.\w+$/i.test(file.name)) {
    return file;
  }
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.slice('image/'.length);
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(part => String(part).padStart(2, '0'));
  return new File([file], `${CHAT_TEXTS.pastedImage}-${time[0]}h${time[1]}m${time[2]}s.${extension}`, { type: file.type });
}

export function fileProblemText(problem: ChatFileProblem): string {
  if (problem === 'FILE_EMPTY') {
    return CHAT_TEXTS.fileEmpty;
  }
  return problem === 'TOO_MANY_FILES' ? CHAT_TEXTS.fileTooMany : CHAT_ERROR_TEXTS[problem];
}
