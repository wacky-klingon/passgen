import { choose as secureChoose } from './random.js';
import { accepts, validatePolicy, SYMBOLS, DIGITS } from './policy.js';

const LOOKALIKES = {
  a: '4@', b: '8', e: '3', g: '9', i: '1!', l: '1', o: '0', s: '5$', t: '7+', z: '2',
};
const SET_NAMES = ['people', 'places', 'things'];

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
    throw new Error('Configured mode requires a sets table. Import a TOML configuration.');
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
    (policy.numbers && DIGITS.includes(c)) || (policy.symbols && SYMBOLS.includes(c)));
}

export function stylize(word, policy, choose = secureChoose) {
  const candidates = indices(word, (c) => replacements(c, policy).length);
  if (!candidates.length || !choose([false, true])) return word;
  const i = choose(candidates);
  return replaceAt(word, i, choose(replacements(word[i], policy)));
}

export function ensureDigit(parts, policy, choose = secureChoose) {
  if (!policy.numbers || parts.some((part) => /[0-9]/.test(part))) return;
  const candidates = parts.flatMap((part, i) => [...part].flatMap((c, j) =>
    [...(LOOKALIKES[c] ?? '')].some((r) => DIGITS.includes(r)) ? [[i, j]] : []));
  if (candidates.length) {
    const [i, j] = choose(candidates);
    const digits = [...LOOKALIKES[parts[i][j]]].filter((c) => DIGITS.includes(c));
    parts[i] = replaceAt(parts[i], j, choose(digits));
  } else {
    const positions = parts.flatMap((part, i) => Array.from({ length: part.length + 1 }, (_, j) => [i, j]));
    const [i, j] = choose(positions);
    parts[i] = parts[i].slice(0, j) + choose(DIGITS) + parts[i].slice(j);
  }
}

export function separatorSource(enabled, choose = secureChoose) {
  let remaining = [];
  let previous = '';
  return () => {
    if (!enabled) return '';
    if (!remaining.length) remaining = [...SYMBOLS];
    const separator = choose(remaining.filter((c) => c !== previous));
    remaining.splice(remaining.indexOf(separator), 1);
    previous = separator;
    return separator;
  };
}

export function generate({ policy: settings = {}, useSets = false, sets, words = 4, dictionary }, choose = secureChoose) {
  const policy = validatePolicy(settings);
  if (!Number.isInteger(words) || words < 4 || words > 128) {
    throw new Error('Word count must be an integer between 4 and 128.');
  }
  if (!Array.isArray(dictionary) || !dictionary.length
    || dictionary.some((word) => typeof word !== 'string' || !/^[a-z]{2,}$/.test(word))) {
    throw new Error('Dictionary is unavailable or invalid.');
  }
  let parts = useSets
    ? configuredSets(sets, policy).map((entries) => choose(entries))
    : Array.from({ length: words }, () => choose(dictionary));
  parts = parts.map((part) => stylize(part, policy, choose));
  ensureDigit(parts, policy, choose);
  const separator = separatorSource(policy.symbols, choose);
  let password = parts[0];
  for (const part of parts.slice(1)) password += separator() + part;
  while (password.length < policy.min_length
    || (policy.mixed_case && indices(password, (c) => /[a-z]/.test(c)).length < 2)) {
    password += separator() + stylize(choose(dictionary), policy, choose);
  }
  if (policy.mixed_case) {
    const i = choose(indices(password, (c) => /[a-z]/.test(c)));
    password = replaceAt(password, i, password[i].toUpperCase());
  }
  if (!accepts(password, policy)) throw new Error('Generated password failed policy validation.');
  return password;
}
