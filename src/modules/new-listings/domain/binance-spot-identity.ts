const LETTER_OR_NUMBER_PATTERN = /^[\p{L}\p{N}]+$/u;

export function isCanonicalBinanceSymbol(value: unknown): value is string {
  return isCanonicalBinanceIdentifier(value, 30);
}

export function isCanonicalBinanceAsset(value: unknown): value is string {
  return isCanonicalBinanceIdentifier(value, 20);
}

function isCanonicalBinanceIdentifier(
  value: unknown,
  maximumCharacters: number,
): value is string {
  if (typeof value !== 'string') return false;
  const characterCount = [...value].length;
  return (
    characterCount >= 1 &&
    characterCount <= maximumCharacters &&
    value.normalize('NFC') === value &&
    value.toUpperCase() === value &&
    LETTER_OR_NUMBER_PATTERN.test(value)
  );
}
