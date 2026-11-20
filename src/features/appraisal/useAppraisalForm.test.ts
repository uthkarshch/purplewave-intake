import { act, renderHook } from '@testing-library/react-native';

import { getCategory } from '@shared/categories';
import type { EnqueueInput } from '@/features/outbox';
import { useAppraisalForm, type AppraisalDeps } from './useAppraisalForm';

const excavator = getCategory('excavator', 1)!;
const tractor = getCategory('tractor', 1)!;

type MockDeps = { [K in keyof AppraisalDeps]: jest.MockedFunction<AppraisalDeps[K]> };

function makeDeps(overrides: Partial<MockDeps> = {}): MockDeps {
  let n = 0;
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    preparePhotos: jest.fn(async (_id: string, sources: { id: string; uri: string }[]) =>
      sources.map((s) => ({ id: s.id, uri: `doc://${s.id}`, sha256: 'h', size: 1 })),
    ),
    pickPhotos: jest.fn().mockResolvedValue(['file://picked.jpg']),
    newId: jest.fn(() => `id-${++n}`),
    ...overrides,
  };
}

async function fillValid(form: { result: { current: ReturnType<typeof useAppraisalForm> } }) {
  const set = (k: string, v: string) => act(async () => form.result.current.setValue(k, v));
  await set('make', 'CAT');
  await set('model', '320');
  await set('year', '2018');
  await set('serial', 'SN-1');
  await set('hours', '4200');
  await set('undercarriage', 'good');
  await act(async () => form.result.current.pickShot('front', 'library'));
  await act(async () => form.result.current.pickShot('hour-meter', 'library'));
}

test('starts on the first category, empty, and cannot submit', async () => {
  const form = await renderHook(() => useAppraisalForm([excavator, tractor], makeDeps()));

  expect(form.result.current.category.id).toBe('excavator');
  expect(form.result.current.values.undercarriage).toBe('fair');
  expect(form.result.current.canSubmit).toBe(false);
  expect(form.result.current.busy).toBe(false);
});

test('a complete form can submit, hands typed fields to the outbox, then resets with a fresh id', async () => {
  const deps = makeDeps();
  const form = await renderHook(() => useAppraisalForm([excavator], deps));
  await fillValid(form);
  expect(form.result.current.canSubmit).toBe(true);

  let result;
  await act(async () => {
    result = await form.result.current.submit();
  });

  expect(result).toEqual({ status: 'saved' });
  expect(deps.preparePhotos).toHaveBeenCalledWith('id-1', [
    { id: 'front', uri: 'file://picked.jpg' },
    { id: 'hour-meter', uri: 'file://picked.jpg' },
  ]);
  expect(deps.enqueue).toHaveBeenCalledWith({
    id: 'id-1',
    categoryId: 'excavator',
    schemaVersion: 1,
    fields: { make: 'CAT', model: '320', year: 2018, serial: 'SN-1', hours: 4200, undercarriage: 'good' },
    photos: [
      { id: 'front', uri: 'doc://front', sha256: 'h', size: 1 },
      { id: 'hour-meter', uri: 'doc://hour-meter', sha256: 'h', size: 1 },
    ],
  });
  expect(form.result.current.values.make).toBeUndefined();
  expect(form.result.current.shotUris).toEqual({});
  expect(form.result.current.canSubmit).toBe(false);
  expect(deps.newId).toHaveBeenCalledTimes(2);
});

test('a second submit while one is in flight is skipped, so only one submission is queued', async () => {
  let release!: () => void;
  const deps = makeDeps({ enqueue: jest.fn((_input: EnqueueInput) => new Promise<void>((resolve) => (release = resolve))) });
  const form = await renderHook(() => useAppraisalForm([excavator], deps));
  await fillValid(form);

  let first!: Promise<unknown>;
  let second;
  await act(async () => {
    first = form.result.current.submit();
    second = await form.result.current.submit();
  });
  expect(second).toEqual({ status: 'skipped' });

  await act(async () => {
    release();
    await first;
  });
  expect(deps.enqueue).toHaveBeenCalledTimes(1);
});

test('a failed enqueue reports the error, keeps the form, and a retry reuses the same id', async () => {
  const deps = makeDeps({ enqueue: jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined) });
  const form = await renderHook(() => useAppraisalForm([excavator], deps));
  await fillValid(form);

  let result;
  await act(async () => {
    result = await form.result.current.submit();
  });
  expect(result).toEqual({ status: 'failed', error: 'disk full' });
  expect(form.result.current.busy).toBe(false);
  expect(form.result.current.values.make).toBe('CAT');

  await act(async () => {
    result = await form.result.current.submit();
  });
  expect(result).toEqual({ status: 'saved' });
  expect(deps.enqueue.mock.calls.map(([input]) => input.id)).toEqual(['id-1', 'id-1']);
});

test('selecting a category resets the form; an unknown id is ignored', async () => {
  const form = await renderHook(() => useAppraisalForm([excavator, tractor], makeDeps()));
  await act(async () => form.result.current.setValue('make', 'CAT'));

  await act(async () => form.result.current.selectCategory('tractor'));
  expect(form.result.current.category.id).toBe('tractor');
  expect(form.result.current.values.make).toBeUndefined();
  expect(form.result.current.values.fourWheelDrive).toBe(false);

  await act(async () => form.result.current.selectCategory('crane'));
  expect(form.result.current.category.id).toBe('tractor');
});

test('picked photos fill a shot or the extras; a cancelled pick changes nothing', async () => {
  const deps = makeDeps();
  const form = await renderHook(() => useAppraisalForm([excavator], deps));

  await act(async () => form.result.current.pickShot('front', 'camera'));
  await act(async () => form.result.current.pickExtra('library'));
  expect(form.result.current.shotUris).toEqual({ front: 'file://picked.jpg' });
  expect(form.result.current.extraUris).toEqual(['file://picked.jpg']);
  expect(deps.pickPhotos).toHaveBeenNthCalledWith(1, 'camera', false);
  expect(deps.pickPhotos).toHaveBeenNthCalledWith(2, 'library', true);

  deps.pickPhotos.mockResolvedValue([]);
  await act(async () => form.result.current.pickShot('hour-meter', 'camera'));
  await act(async () => form.result.current.pickExtra('camera'));
  expect(form.result.current.shotUris).toEqual({ front: 'file://picked.jpg' });
  expect(form.result.current.extraUris).toEqual(['file://picked.jpg']);
});
