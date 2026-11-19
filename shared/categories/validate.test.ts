import { CATEGORIES, getCategory, latestCategories } from './index';
import { coerceValues, validateSubmission } from './validate';

const excavator = getCategory('excavator', 1)!;
const tractor = getCategory('tractor', 1)!;

const validExcavator = {
  make: 'CAT',
  model: '320',
  year: 2018,
  serial: 'SN-1',
  hours: 4200,
  undercarriage: 'good',
};

describe('registry', () => {
  test('looks categories up by id and exact schema version', () => {
    expect(getCategory('tractor', 1)?.label).toBe('Tractor');
    expect(getCategory('tractor', 2)).toBeUndefined();
    expect(getCategory('crane', 1)).toBeUndefined();
  });

  test('every category has unique field keys and unique shot keys', () => {
    for (const c of CATEGORIES) {
      expect(new Set(c.fields.map((f) => f.key)).size).toBe(c.fields.length);
      expect(new Set(c.photoShots.map((s) => s.key)).size).toBe(c.photoShots.length);
    }
  });

  test('offers the highest version of each category', () => {
    expect(latestCategories().map((c) => c.id).sort()).toEqual(['excavator', 'tractor']);
  });
});

describe('validateSubmission', () => {
  test('accepts a complete excavator submission', () => {
    expect(validateSubmission(excavator, validExcavator, ['front', 'hour-meter'])).toEqual([]);
  });

  test('reports missing required fields and photos by name', () => {
    const errors = validateSubmission(excavator, { make: 'CAT' }, ['front']);
    expect(errors.map((e) => e.field).sort()).toEqual(
      ['hours', 'model', 'photo:hour-meter', 'serial', 'undercarriage', 'year'].sort(),
    );
  });

  test('enforces number bounds and type', () => {
    const fieldsOf = (v: Record<string, unknown>) =>
      validateSubmission(excavator, { ...validExcavator, ...v }, ['front', 'hour-meter']).map((e) => e.field);

    expect(fieldsOf({ year: 1800 })).toEqual(['year']);
    expect(fieldsOf({ hours: -1 })).toEqual(['hours']);
    expect(fieldsOf({ hours: 'lots' })).toEqual(['hours']);
    expect(fieldsOf({ hours: Number.NaN })).toEqual(['hours']);
  });

  test('rejects a select value outside its options and unknown fields', () => {
    const errors = validateSubmission(excavator, { ...validExcavator, undercarriage: 'mint', color: 'red' }, ['front', 'hour-meter']);
    expect(errors.map((e) => e.field).sort()).toEqual(['color', 'undercarriage']);
  });

  test('allows extra photos but rejects ids that are neither a shot nor an extra', () => {
    expect(validateSubmission(excavator, validExcavator, ['front', 'hour-meter', 'extra-0', 'extra-12'])).toEqual([]);
    expect(validateSubmission(excavator, validExcavator, ['front', 'hour-meter', 'selfie']).map((e) => e.field)).toEqual([
      'photo:selfie',
    ]);
  });

  test('tractor needs its PTO photo and hitch type, and treats PTO hours as optional', () => {
    const base = { make: 'JD', model: '8R', year: 2020, serial: 'T1', hours: 900, hitchType: '3-point' };

    expect(validateSubmission(tractor, base, ['front', 'hour-meter']).map((e) => e.field)).toEqual(['photo:pto-shaft']);
    expect(validateSubmission(tractor, base, ['front', 'hour-meter', 'pto-shaft'])).toEqual([]);
    expect(validateSubmission(tractor, { ...base, hitchType: undefined }, ['front', 'hour-meter', 'pto-shaft']).map((e) => e.field)).toEqual(['hitchType']);
  });

  test('a boolean field accepts false, and excavator rejects tractor-only fields', () => {
    const base = { make: 'JD', model: '8R', year: 2020, serial: 'T1', hours: 900, hitchType: 'both' };
    expect(validateSubmission(tractor, { ...base, fourWheelDrive: false }, ['front', 'hour-meter', 'pto-shaft'])).toEqual([]);
    expect(validateSubmission(excavator, { ...validExcavator, hitchType: 'both' }, ['front', 'hour-meter']).map((e) => e.field)).toEqual(['hitchType']);
  });
});

describe('coerceValues', () => {
  test('parses numbers, trims text, drops blanks, keeps booleans', () => {
    expect(
      coerceValues(tractor, { make: ' JD ', year: '2020', hours: '', ptoHours: '12.5', fourWheelDrive: false, hitchType: 'both' }),
    ).toEqual({ make: 'JD', year: 2020, ptoHours: 12.5, fourWheelDrive: false, hitchType: 'both' });
  });

  test('leaves an unparseable number as a string so validation can report it', () => {
    const values = coerceValues(excavator, { ...validExcavator, year: 'twenty', hours: '1', make: 'x', model: 'y', serial: 'z', undercarriage: 'good' } as never);
    expect(values.year).toBe('twenty');
    expect(validateSubmission(excavator, values, ['front', 'hour-meter']).map((e) => e.field)).toEqual(['year']);
  });
});
