import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { generate, parseDictionary, separatorSource, stylize, ensureDigit } from '../src/generator.js';
import { accepts, validatePolicy, SYMBOLS } from '../src/policy.js';
import { parseConfig } from '../src/config.js';
import { randomIndex } from '../src/random.js';

const dictionary = parseDictionary(readFileSync(new URL('../../src/passgen/data/english.txt', import.meta.url), 'utf8'));
const sets = { people: ['Sam'], places: ['New York'], things: ['Guitar'] };
const first = (items) => items[0];

test('shared EFF dictionary is normalized and deduplicated', () => {
  expect(dictionary).toHaveLength(7775);
  expect(new Set(dictionary).size).toBe(7775);
});

describe('all policies in both modes', () => {
  for (const useSets of [false, true]) for (const mixed_case of [false, true]) {
    for (const numbers of [false, true]) for (const symbols of [false, true]) {
      test(JSON.stringify({ useSets, mixed_case, numbers, symbols }), () => {
        const policy = validatePolicy({ min_length: 100, mixed_case, numbers, symbols });
        const password = generate({ policy, useSets, sets, dictionary });
        expect(accepts(password, policy)).toBe(true);
      });
    }
  }
});

test('exactly one normalized entry from each set, no fixed suffix', () => {
  expect(generate({ policy: { min_length: 1, mixed_case: false, numbers: false, symbols: false }, useSets: true, sets, dictionary }, first)).toBe('samnewyorkguitar');
  expect(generate({ policy: { min_length: 1, mixed_case: false, symbols: false }, useSets: true, sets, dictionary }, first)).toBe('5amnewyorkguitar');
});

test('dictionary mode ignores unusable sets, uses at least four words', () => {
  expect(generate({ policy: { min_length: 1, mixed_case: false, numbers: false, symbols: false }, sets: 'bad', dictionary: ['meadow'] }, first)).toBe('meadow'.repeat(4));
});

test('separators are unique within each pool and do not repeat across boundaries', () => {
  const next = separatorSource(true, (items) => items.at(-1));
  const result = Array.from({ length: SYMBOLS.length * 3 }, next);
  for (let i = 0; i < result.length; i += SYMBOLS.length) {
    expect(new Set(result.slice(i, i + SYMBOLS.length)).size).toBe(SYMBOLS.length);
  }
  expect(result.every((c, i) => i === 0 || c !== result[i - 1])).toBe(true);
  expect(separatorSource(false)()).toBe('');
});

test.each([['a', '4'], ['e', '3'], ['i', '1']])('numeric lookalike %s', (letter, digit) => {
  const choose = (items) => typeof items[0] === 'boolean' ? true : items[0];
  expect(stylize(letter, validatePolicy({ symbols: false }), choose)).toBe(digit);
});

test.each([['a', '@'], ['i', '!'], ['s', '$'], ['t', '+']])('symbol lookalike %s', (letter, symbol) => {
  const choose = (items) => typeof items[0] === 'boolean' ? true : items[0];
  expect(stylize(letter, validatePolicy({ numbers: false }), choose)).toBe(symbol);
});

test('digit fallback can insert within a word; existing digits need no extra', () => {
  const parts = ['crunch'];
  ensureDigit(parts, validatePolicy(), (items) => Array.isArray(items[0]) ? [0, 1] : items[0]);
  expect(parts).toEqual(['c0runch']);
  ensureDigit(parts, validatePolicy(), () => { throw new Error('unexpected selection'); });
});

test.each([{}, { ...sets, people: [] }, { ...sets, places: ['東京'] }, { ...sets, things: [1] }, { ...sets, people: ['  '] }])('invalid sets fail without exposing entries', (badSets) => {
  expect(() => generate({ useSets: true, sets: badSets, dictionary })).toThrow();
});

test.each([{ min_length: true }, { min_length: 4097 }, { numbers: 'yes' }, { extra: true }, []])('invalid policy rejected', (policy) => {
  expect(() => validatePolicy(policy)).toThrow();
});

test('TOML parsing, defaults, and private diagnostics', () => {
  expect(parseConfig('[password]\nmin_length=24\n[sets]\npeople=["Sam"]').policy.min_length).toBe(24);
  expect(parseConfig('sets="bad"').sets).toBe('bad');
  expect(() => parseConfig('[password]\nnumbers="yes"')).toThrow('boolean');
  expect(() => parseConfig('[secret private entry')).toThrow('Check the TOML syntax');
});

test('rejects invalid dictionary and count', () => {
  expect(() => generate({ dictionary: [] })).toThrow('Dictionary');
  expect(() => generate({ dictionary, words: 3 })).toThrow('Word count');
});

test('rejection sampling discards biased tail before using modulo', () => {
  const values = [0xffffffff, 17];
  expect(randomIndex(10, { getRandomValues(buffer) { buffer[0] = values.shift(); } })).toBe(7);
  expect(values).toHaveLength(0);
  expect(() => randomIndex(0)).toThrow();
  expect(() => randomIndex(4, {})).toThrow('Secure randomness');
});
