import { formatWhen } from './format';

const at = (y: number, m: number, d: number, h = 14, min = 45) => new Date(y, m - 1, d, h, min).getTime();

test('says Today and Yesterday with the time, otherwise the date', () => {
  const now = at(2026, 11, 20, 18, 0);

  expect(formatWhen(at(2026, 11, 20, 14, 45), now)).toMatch(/^Today, \d{1,2}:45/);
  expect(formatWhen(at(2026, 11, 19, 9, 5), now)).toMatch(/^Yesterday, \d{1,2}:05/);
  expect(formatWhen(at(2026, 11, 3, 9, 5), now)).toMatch(/^.+, \d{1,2}:05/);
  expect(formatWhen(at(2026, 11, 3, 9, 5), now)).not.toMatch(/Today|Yesterday/);
});

test('judges the day by the calendar, not by 24 hours', () => {
  const now = at(2026, 11, 20, 0, 10);
  expect(formatWhen(at(2026, 11, 19, 23, 50), now)).toMatch(/^Yesterday/);
});
