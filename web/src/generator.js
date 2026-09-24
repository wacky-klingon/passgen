import { choose as secureChoose } from './random.js';
import { accepts, validatePolicy, SYMBOLS, DIGITS } from './policy.js';

const LOOKALIKES = {
  a: '4@', b: '8', e: '3', g: '9', i: '1!', l: '1', o: '0', s: '5$', t: '7+', z: '2',
};
const SET_NAMES = ['people', 'places', 'things'];
const DEFAULT_WORDS = 3;
const MAX_ATTEMPTS = 128;
const MAX_PARTS = 128;

export function parseDictionary(text) {
  const words = [...new Set(text.trim().split(/\r?\n/).map((word) => word.replaceAll('-', '')))];
  if (!words.length || words.some((word) => !/^[a-z]{2,}$/.test(word))) {
    throw new Error('Bundled dictionary is invalid.');
  }
  return words;
}

export function normalize(entry, policy) {
  const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' + DIGITS + SYMBOLS;
  if ([...entry].some((c) => !/\s/u.test(c) && !allowed.includes(c))) {
    throw new Error('Set entries must use ASCII letters, digits, permitted symbols or whitespace.');
  }
  const result = [...entry].filter((c) => !/\s/u.test(c)
    && (policy.numbers || !DIGITS.includes(c))
    && (policy.symbols || !SYMBOLS.includes(c))).join('').toLowerCase();
  if (!result) throw new Error('A set entry is empty after applying the password policy.');
  return result;
}

function configuredSets(sets, policy) {
  if (!sets || typeof sets !== 'object' || Array.isArray(sets)) {
    throw new Error('Configured mode requires names, places, and things lists.');
  }
  return SET_NAMES.map((name) => {
    const entries = Object.hasOwn(sets, name) ? sets[name] : undefined;
    if (!Array.isArray(entries) || !entries.length || entries.some((e) => typeof e !== 'string')) {
      throw new Error(`sets.${name} must be a nonempty array of strings.`);
    }
    return [...new Set(entries.map((entry) => normalize(entry, policy)))];
  });
}

const replaceAt = (word, i, replacement) => word.slice(0, i) + replacement + word.slice(i + 1);
const indices = (word, predicate) => [...word].flatMap((c, i) => predicate(c) ? [i] : []);

function replacements(letter, policy) {
  return [...(LOOKALIKES[letter] ?? '')].filter((c) =>
    ((policy.numbers && DIGITS.includes(c)) || (policy.symbols && SYMBOLS.includes(c)))
    && (!policy.easy_to_type || !'01'.includes(c)));
}

export function stylize(word, policy, choose = secureChoose) {
  const candidates = indices(word, (c) => replacements(c, policy).length);
  if (!policy.substitutions || !candidates.length || !choose([false, true])) return word;
  const i = choose(candidates);
  return replaceAt(word, i, choose(replacements(word[i], policy)));
}

export function ensureDigit(parts, policy, choose = secureChoose) {
  if (!policy.numbers || parts.some((part) => /[0-9]/.test(part))) return;
  const candidates = policy.substitutions ? parts.flatMap((part, i) => [...part].flatMap((c, j) =>
    [...replacements(c, policy)].some((r) => DIGITS.includes(r)) ? [[i, j]] : [])) : [];
  if (candidates.length) {
    const [i, j] = choose(candidates);
    const digits = [...replacements(parts[i][j], policy)].filter((c) => DIGITS.includes(c));
    parts[i] = replaceAt(parts[i], j, choose(digits));
  } else {
    const positions = parts.flatMap((part, i) => Array.from({ length: part.length + 1 }, (_, j) => [i, j]));
    const [i, j] = choose(positions);
    parts[i] = parts[i].slice(0, j) + choose(policy.easy_to_type ? '23456789' : DIGITS) + parts[i].slice(j);
  }
}

export function separatorSource(enabled, choose = secureChoose) {
  return () => enabled ? choose(SYMBOLS) : '';
}

function joinParts(parts, policy, choose) {
  const separator = separatorSource(policy.symbols, choose);
  return parts.slice(1).reduce((password, part) => password + separator() + part, parts[0]);
}

function joinedLength(parts, policy) {
  if (!parts.length) return 0;
  return parts.reduce((total, part) => total + part.length, 0) + (policy.symbols ? parts.length - 1 : 0);
}

function lowerBoundLength({ useSets, sets, policy, words, dictionary }) {
  const lengths = useSets
    ? configuredSets(sets, policy).map((entries) => Math.min(...entries.map((entry) => entry.length)))
    : Array.from({ length: words }, () => Math.min(...dictionary.map((word) => word.length)));
  return lengths.reduce((total, length) => total + length, 0) + (policy.symbols ? lengths.length - 1 : 0);
}

export function generate({ policy: settings = {}, useSets = false, sets, words = DEFAULT_WORDS, dictionary }, choose = secureChoose) {
  const policy = validatePolicy(settings);
  if (!Number.isInteger(words) || words < 3 || words > 128) {
    throw new Error('Word count must be an integer between 3 and 128.');
  }
  if (!Array.isArray(dictionary) || !dictionary.length
    || dictionary.some((word) => typeof word !== 'string' || !/^[a-z]{2,}$/.test(word))) {
    throw new Error('Dictionary is unavailable or invalid.');
  }
  if (lowerBoundLength({ useSets, sets, policy, words, dictionary }) > policy.max_length) {
    throw new Error('Word count and character range cannot fit.');
  }
  const normalizedSets = useSets ? configuredSets(sets, policy) : undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let parts = useSets
      ? normalizedSets.map((entries) => choose(entries))
      : Array.from({ length: words }, () => choose(dictionary));
    parts = parts.map((part) => stylize(part, policy, choose));
    ensureDigit(parts, policy, choose);
    if (joinedLength(parts, policy) > policy.max_length) continue;

    while (joinedLength(parts, policy) < policy.min_length
      || (policy.mixed_case && (((parts.join('').match(/[a-z]/g)?.length ?? 0) < 2)
        || ![...parts.join('')].some((c) => /[a-z]/.test(c) && (!policy.easy_to_type || !'io'.includes(c)))))) {
      if (parts.length >= MAX_PARTS) {
        parts = [];
        break;
      }
      const candidateParts = [...parts, stylize(choose(dictionary), policy, choose)];
      if (joinedLength(candidateParts, policy) > policy.max_length) {
        parts = [];
        break;
      }
      parts = candidateParts;
    }
    if (!parts.length) continue;

    let password = joinParts(parts, policy, choose);
    if (policy.mixed_case) {
      const lowerIndices = indices(password, (c) => /[a-z]/.test(c) && (!policy.easy_to_type || !'io'.includes(c)));
      if (!lowerIndices.length) continue;
      const i = choose(lowerIndices);
      password = replaceAt(password, i, password[i].toUpperCase());
    }
    if (accepts(password, policy)) return password;
  }
  throw new Error('Could not generate a password within these limits. Increase maximum length, lower minimum length, or adjust the word count.');
}
