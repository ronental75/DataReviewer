/** Unicode block U+0590–U+05FF covers the full Hebrew script range. */
const HEBREW_RANGE = /[֐-׿]/;

/**
 * Returns true if the string contains at least one Hebrew character.
 * Used by ReportViewer to decide whether to set text-align:right on a segment.
 */
export const hasHebrew = (text: string): boolean => HEBREW_RANGE.test(text);
