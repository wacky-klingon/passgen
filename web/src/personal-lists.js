import { normalize } from './generator.js';

export function usableCount(entries, policy) {
  return new Set(entries.map((entry) => normalize(entry, policy))).size;
}

export function parsePersonalList(text, category, policy) {
  const entries = text.split(/\r\n|\n|\r/).map((line) => line.trim()).filter(Boolean);
  if (!entries.length) throw new Error(`${category} list needs at least one entry.`);
  try {
    usableCount(entries, policy);
  } catch {
    throw new Error(`${category} list has an invalid entry for these settings.`);
  }
  return entries;
}
