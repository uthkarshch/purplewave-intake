export type FieldDef =
  | { key: string; label: string; type: 'text'; required?: boolean; multiline?: boolean }
  | { key: string; label: string; type: 'number'; required?: boolean; min?: number; max?: number; unit?: string }
  | { key: string; label: string; type: 'select'; required?: boolean; options: string[] }
  | { key: string; label: string; type: 'boolean'; required?: boolean };

// A shot's key is also the photo id, so the server can check required photos from the manifest alone.
export type PhotoShot = { key: string; label: string; required: boolean };

export type CategoryDef = {
  id: string;
  label: string;
  // Bump when fields change; queued submissions keep validating against the version they were made with.
  schemaVersion: number;
  fields: FieldDef[];
  photoShots: PhotoShot[];
};
