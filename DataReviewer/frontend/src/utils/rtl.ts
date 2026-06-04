const HEBREW_CHAR = /[֐-׿]/;
const LATIN_CHAR = /[A-Za-z]/;

export type TextChunk = { text: string; isHebrew: boolean };

/**
 * Strip <tag> patterns, split text on newlines, then group consecutive
 * words by script so each language run becomes its own chunk.
 * Neutral tokens (numbers, punctuation) inherit the previous run's language.
 */
export function splitByLanguage(raw: string): TextChunk[] {
  const cleaned = raw.replace(/<[^>]+>/g, '').trim();
  const result: TextChunk[] = [];

  for (const line of cleaned.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const tokens = trimmed.match(/\S+\s*/g) ?? [trimmed];
    let buf = '';
    let bufHebrew: boolean | null = null;

    for (const token of tokens) {
      const word = token.trimEnd();
      const script: boolean | null =
        HEBREW_CHAR.test(word) ? true :
        LATIN_CHAR.test(word) ? false :
        null; // neutral — numbers, punctuation

      const effective = script !== null ? script : (bufHebrew ?? false);

      if (bufHebrew === null) {
        bufHebrew = effective;
        buf = token;
      } else if (effective === bufHebrew) {
        buf += token;
      } else {
        if (buf.trim()) result.push({ text: buf.trim(), isHebrew: bufHebrew });
        buf = token;
        bufHebrew = effective;
      }
    }

    if (buf.trim()) result.push({ text: buf.trim(), isHebrew: bufHebrew ?? false });
  }

  return result;
}

/** Returns true if the string contains at least one Hebrew character. */
export const hasHebrew = (text: string): boolean => HEBREW_CHAR.test(text);
