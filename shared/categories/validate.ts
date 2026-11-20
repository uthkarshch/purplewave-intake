import type { CategoryDef } from './types';

export type ValidationError = { field: string; message: string };

const EXTRA_PHOTO_ID = /^extra-\d+$/;

export function validateSubmission(
  category: CategoryDef,
  values: Record<string, unknown>,
  photoIds: string[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const known = new Set(category.fields.map((f) => f.key));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) errors.push({ field: key, message: 'Unknown field' });
  }

  for (const def of category.fields) {
    const value = values[def.key];
    if (value === undefined || value === null || value === '') {
      if (def.required) errors.push({ field: def.key, message: `${def.label} is required` });
      continue;
    }
    if (def.type === 'text' && typeof value !== 'string') {
      errors.push({ field: def.key, message: `${def.label} must be text` });
    } else if (def.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push({ field: def.key, message: `${def.label} must be a number` });
      } else if (def.min !== undefined && value < def.min) {
        errors.push({ field: def.key, message: `${def.label} must be at least ${def.min}` });
      } else if (def.max !== undefined && value > def.max) {
        errors.push({ field: def.key, message: `${def.label} must be at most ${def.max}` });
      }
    } else if (def.type === 'select' && !def.options.includes(value as string)) {
      errors.push({ field: def.key, message: `${def.label} must be one of ${def.options.join(', ')}` });
    } else if (def.type === 'boolean' && typeof value !== 'boolean') {
      errors.push({ field: def.key, message: `${def.label} must be true or false` });
    }
  }

  const shotKeys = new Set(category.photoShots.map((s) => s.key));
  for (const shot of category.photoShots) {
    if (shot.required && !photoIds.includes(shot.key)) {
      errors.push({ field: `photo:${shot.key}`, message: `${shot.label} photo is required` });
    }
  }
  for (const id of photoIds) {
    if (!shotKeys.has(id) && !EXTRA_PHOTO_ID.test(id)) errors.push({ field: `photo:${id}`, message: 'Unknown photo' });
  }
  return errors;
}

// Form inputs are strings; turn them into the typed values the server validates.
// A number that does not parse stays a string so validation reports it instead of hiding it.
// Plain decimals only: Number() would also accept '1e3', '0x10' and ' '.
const NUMBER_PATTERN = /^-?(\d+\.?\d*|\.\d+)$/;

// Keeps only what can be part of a plain decimal number while the user types.
export function sanitizeNumberInput(text: string, allowNegative: boolean): string {
  const negative = allowNegative && text.trimStart().startsWith('-') ? '-' : '';
  const [whole = '', ...rest] = text.replace(/[^\d.]/g, '').split('.');
  return negative + whole + (rest.length ? `.${rest.join('')}` : '');
}

export function coerceValues(category: CategoryDef, raw: Record<string, string | boolean | undefined>) {
  const values: Record<string, unknown> = {};
  for (const def of category.fields) {
    const value = raw[def.key];
    if (typeof value === 'boolean') values[def.key] = value;
    else if (value !== undefined && value.trim() !== '') {
      const trimmed = value.trim();
      values[def.key] = def.type === 'number' && NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : trimmed;
    }
  }
  return values;
}
