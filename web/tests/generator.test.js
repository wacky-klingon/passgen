import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { generate, parseDictionary, separatorSource, stylize, ensureDigit } from '../src/generator.js';
import { accepts, validatePolicy, SYMBOLS } from '../src/policy.js';
import { randomIndex } from '../src/random.js';
import { parsePersonalList, usableCount } from '../src/personal-lists.js';

const dictionary = parseDictionary(readFileSync(new URL('../../src/passgen/data/wordlist.txt', import.meta.url), 'utf8'));
const sets = { people: ['Sam'], places: ['New York'], things: ['Guitar'] };
const first = (items) => items[0];

test('shared EFF dictionary is normalized and deduplicated', () => {
  expect(dictionary.length).toBeGreaterThanOrEqual(10000);
  expect(new Set(dictionary).size).toBe(dictionary.length);
});

describe('all policies in both modes', () => {
  for (const useSets of [false, true]) for (const mixed_case of [false, true]) {
    for (const numbers of [false, true]) for (const symbols of [false, true]) {
      test(JSON.stringify({ useSets, mixed_case, numbers, symbols }), () => {
        const policy = validatePolicy({ min_length: 100, max_length: 128, mixed_case, numbers, symbols });
        const password = generate({ policy, useSets, sets, dictionary });
        expect(accepts(password, policy)).toBe(true);
      });
    }
  }
});

test('exactly one normalized entry from each set, no fixed suffix', () => {
  expect(generate({ policy: { min_length: 1, mixed_case: false, numbers: false, symbols: false }, useSets: true, sets, dictionary }, first)).toBe('samnewyorkguitar');
  expect(generate({ policy: { min_length: 1, mixed_case: false, symbols: false }, useSets: true, sets, dictionary }, first)).toBe('0samnewyorkguitar');
});

test('dictionary mode ignores unusable sets, uses at least three words', () => {
  expect(generate({ policy: { min_length: 1, mixed_case: false, numbers: false, symbols: false }, sets: 'bad', dictionary: ['meadow'] }, first)).toBe('meadow'.repeat(3));
});

test('separators are independent and may repeat', () => {
  const next = separatorSource(true, (items) => items[0]);
  expect(Array.from({ length: 4 }, next)).toEqual(Array(4).fill(SYMBOLS[0]));
  expect(separatorSource(false)()).toBe('');
});

test.each([['a', '4'], ['e', '3'], ['i', '1']])('numeric lookalike %s', (letter, digit) => {
  const choose = (items) => typeof items[0] === 'boolean' ? true : items[0];
  expect(stylize(letter, validatePolicy({ symbols: false, substitutions: true }), choose)).toBe(digit);
});

test.each([['a', '@'], ['i', '!'], ['s', '$'], ['t', '+']])('symbol lookalike %s', (letter, symbol) => {
  const choose = (items) => typeof items[0] === 'boolean' ? true : items[0];
  expect(stylize(letter, validatePolicy({ numbers: false, substitutions: true }), choose)).toBe(symbol);
});

test('digit fallback can insert within a word; existing digits need no extra', () => {
  const parts = ['crunch'];
  ensureDigit(parts, validatePolicy(), (items) => Array.isArray(items[0]) ? [0, 1] : items[0]);
  expect(parts).toEqual(['c0runch']);
  ensureDigit(parts, validatePolicy(), () => { throw new Error('unexpected selection'); });
});

test('substitutions are off by default and easy-to-type avoids introduced 0, 1, I, O', () => {
  const yes = (items) => typeof items[0] === 'boolean' ? true : items[0];
  expect(stylize('a', validatePolicy(), yes)).toBe('a');
  expect(stylize('o', validatePolicy({ substitutions: true, easy_to_type: true }), yes)).toBe('o');
  const parts = ['rhythm'];
  ensureDigit(parts, validatePolicy({ easy_to_type: true }), yes);
  expect(parts.join('')).toContain('2');
  const password = generate({
    policy: { min_length: 1, mixed_case: true, numbers: false, symbols: false, easy_to_type: true },
    useSets: true, sets: { people: ['i'], places: ['o'], things: ['i'] }, dictionary: ['meadow'],
  }, yes);
  expect(password).toBe('ioiMeadow');
});

test('personal TXT parsing rejects private invalid entries and deduplicates after normalization', () => {
  const policy = validatePolicy({ numbers: false, symbols: false });
  const entries = parsePersonalList(' Sam \n\nS am\r\n', 'names', policy);
  expect(entries).toEqual(['Sam', 'S am']);
  expect(usableCount(entries, policy)).toBe(1);
  expect(parsePersonalList('Sam\rAlex', 'names', policy)).toEqual(['Sam', 'Alex']);
  expect(() => parsePersonalList('Private東京', 'names', policy)).toThrow('names list has an invalid entry');
  expect(() => parsePersonalList(' \n ', 'names', policy)).toThrow('needs at least one');
});

test.each([{}, { ...sets, people: [] }, { ...sets, places: ['東京'] }, { ...sets, things: [1] }, { ...sets, people: ['  '] }])('invalid sets fail without exposing entries', (badSets) => {
  expect(() => generate({ useSets: true, sets: badSets, dictionary })).toThrow();
});

test.each([{ min_length: true }, { max_length: 129 }, { min_length: 65 }, { numbers: 'yes' }, { extra: true }, []])('invalid policy rejected', (policy) => {
  expect(() => validatePolicy(policy)).toThrow();
});

test('rejects invalid dictionary and count', () => {
  expect(() => generate({ dictionary: [] })).toThrow('Dictionary');
  expect(() => generate({ dictionary, words: 2 })).toThrow('Word count');
});

test('generated passwords stay inside the inclusive character range', () => {
  const policy = validatePolicy({ min_length: 16, max_length: 16, mixed_case: false, numbers: false, symbols: false });
  expect(generate({ policy, words: 3, dictionary: ['able', 'baker', 'cider'] }, first)).toHaveLength(16);
  expect(() => generate({ policy: { min_length: 4, max_length: 4, mixed_case: false, numbers: false, symbols: true }, words: 3, dictionary: ['able'] }, first)).toThrow('fit');
});

test('rejection sampling discards biased tail before using modulo', () => {
  const values = [0xffffffff, 17];
  expect(randomIndex(10, { getRandomValues(buffer) { buffer[0] = values.shift(); } })).toBe(7);
  expect(values).toHaveLength(0);
  expect(() => randomIndex(0)).toThrow();
  expect(() => randomIndex(4, {})).toThrow('Secure randomness');
});
