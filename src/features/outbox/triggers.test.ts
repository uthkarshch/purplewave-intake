import { attachTriggers, type TriggerSources } from './triggers';

function fakeSources() {
  const listeners: { foreground?: () => void; reachable?: () => void } = {};
  const off = { foreground: jest.fn(), reachable: jest.fn() };
  const sources: TriggerSources = {
    intervalMs: 1_000,
    onForeground: (cb) => {
      listeners.foreground = cb;
      return off.foreground;
    },
    onReachable: (cb) => {
      listeners.reachable = cb;
      return off.reachable;
    },
  };
  return { sources, listeners, off };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('requests a drain on foreground, on reachability, and on a timer', () => {
  const { sources, listeners } = fakeSources();
  const drain = jest.fn();
  attachTriggers(drain, sources);

  listeners.foreground!();
  listeners.reachable!();
  jest.advanceTimersByTime(2_500);

  expect(drain).toHaveBeenCalledTimes(4);
});

test('cleanup unsubscribes and stops the timer', () => {
  const { sources, off } = fakeSources();
  const drain = jest.fn();
  const detach = attachTriggers(drain, sources);

  detach();
  jest.advanceTimersByTime(5_000);

  expect(off.foreground).toHaveBeenCalled();
  expect(off.reachable).toHaveBeenCalled();
  expect(drain).not.toHaveBeenCalled();
});
