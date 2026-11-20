import type { CategoryDef } from './types';

export const tractorV1: CategoryDef = {
  id: 'tractor',
  label: 'Tractor',
  schemaVersion: 1,
  fields: [
    { key: 'make', label: 'Make', type: 'text', required: true },
    { key: 'model', label: 'Model', type: 'text', required: true },
    { key: 'year', label: 'Year', type: 'number', required: true, min: 1950, max: 2100 },
    { key: 'serial', label: 'Serial number', type: 'text', required: true },
    { key: 'hours', label: 'Engine hours', type: 'number', required: true, min: 0, unit: 'h' },
    { key: 'ptoHours', label: 'PTO hours', type: 'number', min: 0, unit: 'h' },
    { key: 'hitchType', label: 'Hitch type', type: 'select', required: true, options: ['3-point', 'drawbar', 'both'], defaultValue: '3-point' },
    { key: 'fourWheelDrive', label: 'Four-wheel drive', type: 'boolean' },
    { key: 'condition', label: 'Condition notes', type: 'text', multiline: true },
  ],
  photoShots: [
    { key: 'front', label: 'Front', required: true },
    { key: 'hour-meter', label: 'Hour meter', required: true },
    { key: 'pto-shaft', label: 'PTO shaft', required: true },
    { key: 'tires', label: 'Tires', required: false },
  ],
};
