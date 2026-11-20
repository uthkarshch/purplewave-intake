import type { FieldDef } from '@shared/categories';

export type FieldValue = string | boolean | undefined;

export type FieldRendererProps<F extends FieldDef = FieldDef> = {
  field: F;
  value: FieldValue;
  error?: string;
  onChange: (value: string | boolean) => void;
};
