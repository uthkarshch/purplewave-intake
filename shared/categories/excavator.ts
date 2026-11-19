import type { CategoryDef } from './types';

export const excavatorV1: CategoryDef = {
  id: 'excavator',
  label: 'Excavator',
  schemaVersion: 1,
  fields: [
    { key: 'make', label: 'Make', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text', required: true },
    { key: 'year', label: 'Year', type: 'number', required: true, min: 1950, max: 2100 },
    { key: 'serial', label: 'Serial number', type: 'text', required: true },
    { key: 'hours', label: 'Hours', type: 'number', required: true, min: 0, unit: 'h' },
    { key: 'undercarriage', label: 'Undercarriage', type: 'select', required: true, options: ['good', 'fair', 'poor'] },
    { key: 'condition', label: 'Condition notes', type: 'text', multiline: true },
  ],
  photoShots: [
    { key: 'front', label: 'Front', required: true },
    { key: 'hour-meter', label: 'Hour meter', required: true },
    { key: 'serial-plate', label: 'Serial plate', required: false },
  ],
};
