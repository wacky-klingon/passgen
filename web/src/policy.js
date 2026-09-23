export const SYMBOLS = '!@#$%&*+-_=?';
export const DIGITS = '0123456789';
export const DEFAULT_POLICY = Object.freeze({
  min_length: 16, mixed_case: true, numbers: true, symbols: true,
});

export function validatePolicy(settings = {}) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(settings))) {
    throw new Error('password must be a TOML table.');
  }
  if (Object.keys(settings).some((key) => !Object.hasOwn(DEFAULT_POLICY, key))) {
    throw new Error('Unknown password setting.');
  }
  const policy = { ...DEFAULT_POLICY, ...settings };
  if (!Number.isInteger(policy.min_length) || policy.min_length < 1 || policy.min_length > 4096) {
    throw new Error('Minimum length must be an integer between 1 and 4096.');
  }
  for (const key of ['mixed_case', 'numbers', 'symbols']) {
    if (typeof policy[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
  }
  return policy;
}

export function accepts(password, policy) {
  let allowed = 'abcdefghijklmnopqrstuvwxyz';
  if (policy.mixed_case) allowed += allowed.toUpperCase();
  if (policy.numbers) allowed += DIGITS;
  if (policy.symbols) allowed += SYMBOLS;
  return password.length >= policy.min_length
    && [...password].every((c) => allowed.includes(c))
    && (!policy.mixed_case || (/[a-z]/.test(password) && /[A-Z]/.test(password)))
    && (!policy.numbers || /[0-9]/.test(password))
    && (!policy.symbols || [...password].some((c) => SYMBOLS.includes(c)));
}
