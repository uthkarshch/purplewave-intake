import { computeBackoff, MAX_BACKOFF_MS, MIN_DELAY_MS } from './backoff';

describe('computeBackoff', () => {
  test('ceiling doubles per attempt', () => {
    expect(computeBackoff(1, () => 0.999)).toBeCloseTo(999, 0);
    expect(computeBackoff(2, () => 0.999)).toBeCloseTo(1998, 0);
    expect(computeBackoff(4, () => 0.999)).toBeCloseTo(7992, 0);
  });

  test('is capped at the maximum', () => {
    expect(computeBackoff(30, () => 0.999999)).toBeLessThanOrEqual(MAX_BACKOFF_MS);
  });

  test('never returns less than the minimum delay, even with an unlucky jitter roll', () => {
    expect(computeBackoff(1, () => 0)).toBe(MIN_DELAY_MS);
  });

  test('treats Retry-After as a floor', () => {
    expect(computeBackoff(1, () => 0.1, 20_000)).toBe(20_000);
  });

  test('caps an excessive Retry-After at the maximum', () => {
    expect(computeBackoff(1, () => 0.1, 10 * MAX_BACKOFF_MS)).toBe(MAX_BACKOFF_MS);
  });
});
