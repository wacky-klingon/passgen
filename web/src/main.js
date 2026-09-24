import './styles.css';
// Reuse the Python source data rather than maintaining a second dictionary copy.
import wordlist from '../../src/passgen/data/english.txt?raw';
import { generate, parseDictionary } from './generator.js';
import { parseConfig } from './config.js';
import { DEFAULT_POLICY } from './policy.js';

const DISPLAY_MS = 10000;
const RECENT_LIMIT = 10;

const get = (id) => document.getElementById(id);
const dictionary = parseDictionary(wordlist);
let sets;
let importVersion = 0;
let outputVersion = 0;
let generationCounter = 0;
let current = null;
let currentTimer = null;
let countdownTimer = null;
let recentEntries = [];
let copying = false;

function policyFromControls() {
  return {
    min_length: Number(get('min-length').value),
    max_length: Number(get('max-length').value),
    mixed_case: get('mixed-case').checked,
    numbers: get('numbers').checked,
    symbols: get('symbols').checked,
  };
}

function updateSettingsSummary() {
  const mode = get('mode').value === 'configured' ? 'configured sets' : `at least ${get('words').value} words`;
  const requirements = [
    get('mixed-case').checked ? 'mixed case' : 'lowercase only',
    get('numbers').checked ? 'numbers' : 'no numbers',
    get('symbols').checked ? 'symbols' : 'no symbols',
  ].join(' · ');
  get('settings-summary').textContent = `${mode} · ${get('min-length').value}–${get('max-length').value} characters · ${requirements}`;
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
  currentTimer = setTimeout(() => expireCurrent(entry.id), DISPLAY_MS);
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
  updateSettingsSummary();
}

function updateMode() {
  const configured = get('mode').value === 'configured';
  get('words').disabled = configured;
  get('mode-note').textContent = configured
    ? 'Personal words are guessable. Selects one person, one place and one thing from your file.'
    : 'More requested words increase guessing resistance when the selected length range can fit them.';
  updateSettingsSummary();
}

for (const id of ['mode', 'words', 'min-length', 'max-length', 'mixed-case', 'numbers', 'symbols']) {
  get(id).addEventListener('change', updateSettingsSummary);
  get(id).addEventListener('input', updateSettingsSummary);
}
get('mode').addEventListener('change', updateMode);
updateMode();

get('config').addEventListener('change', async () => {
  const version = ++importVersion;
  const file = get('config').files[0];
  if (!file) return;
  // Forget old sets while loading so a failed replacement cannot use stale personal data.
  sets = undefined;
  get('config-status').textContent = 'Reading locally…';
  try {
    if (file.size > 1024 * 1024) throw new Error('Configuration must be no larger than 1 MiB.');
    let text;
    try { text = await file.text(); } catch { throw new Error('Could not read the selected file.'); }
    if (version !== importVersion) return;
    const config = parseConfig(text);
    sets = config.sets;
    applyPolicy(config.policy);
    get('config-status').textContent = 'Configuration loaded locally. Settings apply to the next password.';
  } catch (error) {
    if (version === importVersion) get('config-status').textContent = error.message;
  } finally {
    if (version === importVersion) get('config').value = '';
  }
});

get('forget').addEventListener('click', () => {
  ++importVersion;
  ++outputVersion;
  sets = undefined;
  applyPolicy(DEFAULT_POLICY);
  get('words').value = 3;
  get('mode').value = 'dictionary';
  get('config').value = '';
  get('config-status').textContent = 'Configuration forgotten. Defaults restored.';
  clearActive('The system clipboard has not been cleared.');
  updateMode();
});

get('generate').addEventListener('click', () => {
  reconcileDeadline();
  const useSets = get('mode').value === 'configured';
  let password;
  try {
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
  setActive({ id, password, deadline: Date.now() + DISPLAY_MS });
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
