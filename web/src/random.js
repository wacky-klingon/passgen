// Reject the uneven tail of the uint32 range to avoid modulo bias.
export function randomIndex(length, cryptoSource = globalThis.crypto) {
  const range = 2 ** 32;
  if (!Number.isInteger(length) || length < 1 || length > range) {
    throw new Error('Invalid selection size.');
  }
  if (!cryptoSource?.getRandomValues) {
    throw new Error('Secure randomness is unavailable in this browser.');
  }
  const limit = range - (range % length);
  const buffer = new Uint32Array(1);
  do {
    cryptoSource.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % length;
}

export const choose = (items) => items[randomIndex(items.length)];
