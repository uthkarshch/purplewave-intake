import { excavatorV1 } from './excavator';
import { tractorV1 } from './tractor';
import type { CategoryDef } from './types';

// Adding a category means adding one definition file and listing it here.
export const CATEGORIES: CategoryDef[] = [excavatorV1, tractorV1];

export const getCategory = (id: string, schemaVersion: number): CategoryDef | undefined =>
  CATEGORIES.find((c) => c.id === id && c.schemaVersion === schemaVersion);

// What a new submission should use: the highest version of each category.
export function latestCategories(): CategoryDef[] {
  const latest = new Map<string, CategoryDef>();
  for (const c of CATEGORIES) {
    if (!latest.has(c.id) || latest.get(c.id)!.schemaVersion < c.schemaVersion) latest.set(c.id, c);
  }
  return [...latest.values()];
}

export type { CategoryDef, FieldDef, PhotoShot } from './types';
export { validateSubmission, coerceValues, type ValidationError } from './validate';
