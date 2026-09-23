import './styles.css';
// Reuse the Python source data rather than maintaining a second dictionary copy.
import wordlist from '../../src/passgen/data/english.txt?raw';
import { generate, parseDictionary } from './generator.js';
import { parseConfig } from './config.js';
import { DEFAULT_POLICY } from './policy.js';

const get = (id) => document.getElementById(id);
const dictionary = parseDictionary(wordlist);
let sets;
let importVersion = 0;
let outputVersion = 0;

function appendHistory(password) {
  const item = document.createElement('li');
  const value = document.createElement('span');
  value.textContent = '••••••••';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = 'Show';
  toggle.setAttribute('aria-pressed', 'false');
  let visible = false;
  toggle.addEventListener('click', () => {
    visible = !visible;
    value.textContent = visible ? password : '••••••••';
    toggle.textContent = visible ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(visible));
  });
  item.append(value, ' ', toggle);
  get('password-history').prepend(item);
}

function applyPolicy(policy) {
  get('min-length').value = policy.min_length;
  get('mixed-case').checked = policy.mixed_case;
  get('numbers').checked = policy.numbers;
  get('symbols').checked = policy.symbols;
}

function updateMode() {
  const configured = get('mode').value === 'configured';
  get('words').disabled = configured;
  get('mode-note').textContent = configured
    ? 'Personal words are guessable. Selects one person, one place and one thing from your file.'
    : 'Six or more words are recommended for sensitive accounts.';
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
    try { text = await file.text(); }
    catch { throw new Error('Could not read the selected file.'); }
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
  get('words').value = 4;
  get('mode').value = 'dictionary';
  get('config').value = '';
  get('config-status').textContent = 'Configuration forgotten. Defaults restored.';
  get('password').textContent = 'Click to generate and copy';
  get('manual-copy').hidden = true;
  get('copy-text').value = '';
  get('status').textContent = 'The system clipboard has not been cleared.';
  updateMode();
});

get('password').addEventListener('click', async () => {
  const button = get('password');
  const useSets = get('mode').value === 'configured';
  let password;
  try {
    password = generate({
      policy: {
        min_length: Number(get('min-length').value),
        mixed_case: get('mixed-case').checked,
        numbers: get('numbers').checked,
        symbols: get('symbols').checked,
      },
      useSets, sets, words: useSets ? 4 : Number(get('words').value), dictionary,
    });
  } catch (error) {
    get('status').textContent = error.message;
    return;
  }
  const version = ++outputVersion;
  button.textContent = password;
  appendHistory(password);
  get('manual-copy').hidden = true;
  get('copy-text').value = '';
  button.disabled = true;
  try {
    // Invoked directly within the click gesture for browser clipboard permissions.
    await navigator.clipboard.writeText(password);
    if (version !== outputVersion) return;
    get('status').textContent = 'New password copied. Clipboard history may retain it.';
  } catch {
    if (version !== outputVersion) return;
    get('status').textContent = 'Generated, but copying failed. Use the selected text below to copy manually.';
    get('manual-copy').hidden = false;
    get('copy-text').value = password;
    get('copy-text').focus();
    get('copy-text').select();
  } finally {
    button.disabled = false;
  }
});
