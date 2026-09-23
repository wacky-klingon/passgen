import { parse } from 'smol-toml';
import { validatePolicy } from './policy.js';

export function parseConfig(text) {
  let config;
  try {
    config = parse(text);
  } catch {
    // Parser diagnostics can include private source entries. Do not display them.
    throw new Error('Cannot read configuration. Check the TOML syntax.');
  }
  const policy = validatePolicy(config.password ?? {});
  return { policy, sets: config.sets };
}
