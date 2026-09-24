import './styles.css';
// Reuse the Python source data rather than maintaining a second dictionary copy.
import wordlist from '../../src/passgen/data/wordlist.txt?raw';
import defaultNames from '../../src/passgen/data/names.txt?raw';
import defaultPlaces from '../../src/passgen/data/places.txt?raw';
import defaultThings from '../../src/passgen/data/things.txt?raw';
import { generate, parseDictionary } from './generator.js';
import { parsePersonalList, usableCount } from './personal-lists.js';
import { DEFAULT_POLICY } from './policy.js';

const DEFAULT_DISPLAY_SECONDS = 10;
const RECENT_LIMIT = 10;
const CATEGORIES = { people: 'names', places: 'places', things: 'things' };
const DEFAULT_LISTS = {
  people: { filename: 'names.txt', text: defaultNames },
  places: { filename: 'places.txt', text: defaultPlaces },
  things: { filename: 'things.txt', text: defaultThings },
};

const get = (id) => document.getElementById(id);
const dictionary = parseDictionary(wordlist);
let sets = Object.fromEntries(Object.entries(DEFAULT_LISTS).map(([category, value]) =>
  [category, parsePersonalList(value.text, CATEGORIES[category], DEFAULT_POLICY)]));
let listSources = Object.fromEntries(Object.entries(DEFAULT_LISTS).map(([category, value]) =>
  [category, `default ${value.filename}`]));
let listVersions = { people: 0, places: 0, things: 0 };
let outputVersion = 0;
let generationCounter = 0;
let current = null;
let currentTimer = null;
let countdownTimer = null;
let recentEntries = [];
let copying = false;

for (const [category, value] of Object.entries(DEFAULT_LISTS)) {
  get(`${category}-paste`).value = value.text.trim();
}

function policyFromControls() {
  return {
    min_length: Number(get('min-length').value),
    max_length: Number(get('max-length').value),
    mixed_case: get('mixed-case').checked,
    numbers: get('numbers').checked,
    symbols: get('symbols').checked,
    substitutions: get('substitutions').checked,
    easy_to_type: get('easy-to-type').checked,
  };
}

function renderPersonalStatuses() {
  for (const [category, label] of Object.entries(CATEGORIES)) {
    const entries = sets?.[category];
    if (!Array.isArray(entries) || !entries.length) {
      get(`${category}-status`).textContent = `No ${label} loaded.`;
      continue;
    }
    try {
      const count = usableCount(entries, policyFromControls());
      get(`${category}-status`).textContent = `${count} usable ${label} entries (${listSources[category] ?? 'local TXT'}).`;
    } catch {
      get(`${category}-status`).textContent = `${label} list needs review for these settings.`;
    }
  }
}

function updateWordInfo() {
  const count = get('words').value;
  get('word-info-text').textContent = `Dictionary mode requests at least ${count} words from ${dictionary.length.toLocaleString()} usable words. Extra words may be added to meet the minimum character count. The character range limits which combinations can be returned; this is not a strength score.`;
}

function updateSettingsSummary() {
  const mode = get('mode').value === 'configured' ? 'configured sets' : `at least ${get('words').value} words`;
  const requirements = [
    get('mixed-case').checked ? 'mixed case' : 'lowercase only',
    get('numbers').checked ? 'numbers' : 'no numbers',
    get('symbols').checked ? 'symbols' : 'no symbols',
  ].join(' · ');
  get('settings-summary').textContent = `${mode} · ${get('min-length').value}–${get('max-length').value} characters · ${requirements}`;
  updateWordInfo();
  renderPersonalStatuses();
}

function renderRecent() {
  const list = get('password-history');
  list.replaceChildren();
  for (const entry of recentEntries) {
    const item = document.createElement('li');
    item.setAttribute('aria-label', `Password ${entry.id}`);
    const label = document.createElement('strong');
    label.className = 'sr-only';
    label.textContent = `Password ${entry.id}`;
    const value = document.createElement('span');
    value.textContent = '••••••••';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.addEventListener('click', async () => {
      copy.disabled = true;
      try {
        await navigator.clipboard.writeText(entry.password);
        copy.textContent = 'Copied';
        get('status').textContent = 'Recent password copied. Clipboard history may retain it.';
        setTimeout(() => {
          if (document.contains(copy)) copy.textContent = 'Copy';
        }, 1500);
      } catch {
        get('status').textContent = 'Could not copy recent password. Use Show, then copy it manually.';
      } finally {
        if (document.contains(copy)) copy.disabled = false;
      }
    });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = 'Show';
    toggle.setAttribute('aria-pressed', 'false');
    let visible = false;
    toggle.addEventListener('click', () => {
      visible = !visible;
      value.textContent = visible ? entry.password : '••••••••';
      toggle.textContent = visible ? 'Hide' : 'Show';
      toggle.setAttribute('aria-pressed', String(visible));
    });
    item.append(label, copy, toggle, value);
    list.append(item);
  }
}

function addRecent(entry) {
  if (!entry) return;
  recentEntries = [entry, ...recentEntries.filter((item) => item.id !== entry.id)].slice(0, RECENT_LIMIT);
  renderRecent();
}

function clearTimer() {
  if (currentTimer !== null) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function updateCountdown() {
  if (!current) return;
  const seconds = Math.max(0, Math.ceil((current.deadline - Date.now()) / 1000));
  get('expiry').textContent = `Moves to recent passwords in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
  if (seconds <= 0) expireCurrent(current.id);
}

function setActive(entry) {
  current = entry;
  get('password').value = entry.password;
  get('character-count').textContent = `${entry.password.length} characters. `;
  get('status').textContent = 'Password generated. Click Copy to copy it.';
  get('manual-copy').hidden = true;
  get('copy-text').value = '';
  get('copy').textContent = 'Copy';
  get('copy').disabled = copying;
  get('generate').textContent = 'Generate another';
  clearTimer();
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
  currentTimer = setTimeout(() => expireCurrent(entry.id), entry.durationMs);
}

function clearActive(message = 'Moved to recent passwords.') {
  clearTimer();
  current = null;
  get('password').value = '';
  get('character-count').textContent = '';
  get('expiry').textContent = '';
  get('copy').textContent = 'Copy';
  get('copy').disabled = true;
  get('manual-copy').hidden = true;
  get('copy-text').value = '';
  get('status').textContent = message;
}

function archiveCurrent() {
  if (!current) return;
  addRecent({ id: current.id, password: current.password });
}

function expireCurrent(id) {
  if (!current || current.id !== id) return;
  archiveCurrent();
  ++outputVersion;
  clearActive('Moved to recent passwords.');
}

function reconcileDeadline() {
  if (!current) return;
  if (Date.now() >= current.deadline) expireCurrent(current.id);
  else updateCountdown();
}

function resetPageState() {
  sets = {};
  listSources = {};
  for (const category of Object.keys(CATEGORIES)) {
    ++listVersions[category];
    const defaults = DEFAULT_LISTS[category];
    sets[category] = parsePersonalList(defaults.text, CATEGORIES[category], DEFAULT_POLICY);
    listSources[category] = `default ${defaults.filename}`;
    get(`${category}-file`).value = '';
    get(`${category}-paste`).value = defaults.text.trim();
  }
  get('list-status').textContent = 'Default TXT lists restored.';
  applyPolicy(DEFAULT_POLICY);
  get('words').value = 3;
  get('mode').value = 'dictionary';
  get('display-duration').value = String(DEFAULT_DISPLAY_SECONDS);
  get('footer-duration').textContent = `${DEFAULT_DISPLAY_SECONDS} seconds`;
  updateMode();
  ++outputVersion;
  clearActive('Ready.');
  recentEntries = [];
  renderRecent();
  get('generate').textContent = 'Generate password';
}

function applyPolicy(policy) {
  get('min-length').value = policy.min_length;
  get('max-length').value = policy.max_length;
  get('mixed-case').checked = policy.mixed_case;
  get('numbers').checked = policy.numbers;
  get('symbols').checked = policy.symbols;
  get('substitutions').checked = policy.substitutions;
  get('easy-to-type').checked = policy.easy_to_type;
  updateSettingsSummary();
}

function updateMode() {
  const configured = get('mode').value === 'configured';
  get('words').disabled = configured;
  get('mode-note').textContent = configured
    ? 'Personal words are guessable. Selects one name, one place and one thing from your lists.'
    : 'More requested words increase guessing resistance when the selected length range can fit them.';
  updateSettingsSummary();
}

get('display-duration').addEventListener('change', () => {
  get('footer-duration').textContent = `${get('display-duration').value} seconds`;
});

for (const id of ['mode', 'words', 'min-length', 'max-length', 'mixed-case', 'numbers', 'symbols', 'substitutions', 'easy-to-type']) {
  get(id).addEventListener('change', updateSettingsSummary);
  get(id).addEventListener('input', updateSettingsSummary);
}
get('mode').addEventListener('change', updateMode);
updateMode();

function replaceCategory(category, text, source) {
  const entries = parsePersonalList(text, CATEGORIES[category], policyFromControls());
  sets = { ...(sets && typeof sets === 'object' && !Array.isArray(sets) ? sets : {}), [category]: entries };
  listSources[category] = source;
  renderPersonalStatuses();
}

for (const [category, label] of Object.entries(CATEGORIES)) {
  get(`${category}-use-paste`).addEventListener('click', () => {
    try {
      ++listVersions[category];
      replaceCategory(category, get(`${category}-paste`).value, 'pasted');
      get('list-status').textContent = `Edited ${label} loaded locally.`;
    } catch (error) {
      get('list-status').textContent = error.message;
    }
  });
  get(`${category}-file`).addEventListener('change', async () => {
    const version = ++listVersions[category];
    const file = get(`${category}-file`).files[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error(`${label} list must be no larger than 1 MiB.`);
      let text;
      try { text = await file.text(); } catch { throw new Error(`Could not read ${label} list.`); }
      if (version !== listVersions[category]) return;
      replaceCategory(category, text, file.name);
      get(`${category}-paste`).value = text.trim();
      get('list-status').textContent = `${label} list loaded locally.`;
    } catch (error) {
      if (version === listVersions[category]) get('list-status').textContent = error.message;
    } finally {
      if (version === listVersions[category]) get(`${category}-file`).value = '';
    }
  });
  get(`${category}-clear`).addEventListener('click', () => {
    ++listVersions[category];
    if (sets && typeof sets === 'object') delete sets[category];
    delete listSources[category];
    get(`${category}-paste`).value = '';
    get(`${category}-file`).value = '';
    renderPersonalStatuses();
    get('list-status').textContent = `${label} list cleared.`;
  });
}

get('generate').addEventListener('click', () => {
  reconcileDeadline();
  const useSets = get('mode').value === 'configured';
  let password;
  try {
    if (useSets) {
      const missing = Object.entries(CATEGORIES).find(([category]) => !Array.isArray(sets?.[category]) || !sets[category].length);
      if (missing) throw new Error(`Add a ${missing[1]} list before generating a configured password.`);
    }
    password = generate({
      policy: policyFromControls(),
      useSets,
      sets,
      words: useSets ? 3 : Number(get('words').value),
      dictionary,
    });
  } catch (error) {
    get('status').textContent = error.message;
    return;
  }
  archiveCurrent();
  ++outputVersion;
  const id = ++generationCounter;
  const durationMs = Number(get('display-duration').value) * 1000;
  setActive({ id, password, deadline: Date.now() + durationMs, durationMs });
});

get('copy').addEventListener('click', async () => {
  reconcileDeadline();
  if (current === null || copying) return;
  const { password, id } = current;
  const version = outputVersion;
  copying = true;
  get('copy').disabled = true;
  try {
    // Invoked directly within the click gesture for browser clipboard permissions.
    await navigator.clipboard.writeText(password);
    if (version !== outputVersion || !current || current.id !== id) return;
    get('copy').textContent = 'Copied';
    get('status').textContent = 'Password copied. Clipboard history may retain it.';
    setTimeout(() => {
      if (version === outputVersion && current && current.id === id) get('copy').textContent = 'Copy';
    }, 1500);
  } catch {
    if (version !== outputVersion || !current || current.id !== id) return;
    get('status').textContent = 'Generated, but copying failed. Use the selected text below to copy manually.';
    get('manual-copy').hidden = false;
    get('copy-text').value = password;
    get('copy-text').focus();
    get('copy-text').select();
  } finally {
    copying = false;
    get('copy').disabled = current === null;
  }
});

document.addEventListener('visibilitychange', reconcileDeadline);
window.addEventListener('focus', reconcileDeadline);
window.addEventListener('pagehide', resetPageState);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) resetPageState();
});
