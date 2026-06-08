const HEBREW_CHAR = /[֐-׿]/;
const LATIN_CHAR = /[A-Za-z]/;

export type TextChunk = { text: string; isHebrew: boolean };

/**
 * Split a single paragraph's text into language-direction runs.
 * Neutral tokens (numbers, punctuation) inherit the previous run's direction.
 */
function splitParagraphByLanguage(text: string): TextChunk[] {
  const result: TextChunk[] = [];
  const tokens = text.match(/\S+\s*/g) ?? [text];
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
  return result;
}

/**
 * Process report text:
 * - Replace <tag> placeholders with 2 spaces
 * - Split on ||| to get paragraphs (new lines)
 * - Within each paragraph, split by language direction (inline, no extra line breaks)
 *
 * Returns an array of paragraphs, each being an array of direction-tagged chunks.
 */
export function processReportText(raw: string): TextChunk[][] {
  const cleaned = raw.replace(/<[^>]+>/g, '  ').trim();
  const paragraphs = cleaned.split('|||').map((p) => p.trim()).filter((p) => p.length > 0);
  return paragraphs.map(splitParagraphByLanguage);
}

/** Returns true if the string contains at least one Hebrew character. */
export const hasHebrew = (text: string): boolean => HEBREW_CHAR.test(text);
