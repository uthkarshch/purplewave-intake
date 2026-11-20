import { useRef, useState } from 'react';

import { coerceValues, validateSubmission, type CategoryDef } from '@shared/categories';
import type { EnqueueInput } from '@/features/outbox';
import { initialValues, type FormValues } from './category-form';
import type { PhotoSource } from './photos/photo-slots';

export type AppraisalDeps = {
  enqueue: (input: EnqueueInput) => Promise<unknown>;
  preparePhotos: (submissionId: string, sources: { id: string; uri: string }[]) => Promise<EnqueueInput['photos']>;
  pickPhotos: (source: PhotoSource, multiple: boolean) => Promise<string[]>;
  newId: () => string;
};

export type SubmitResult = { status: 'saved' } | { status: 'skipped' } | { status: 'failed'; error: string };

export function useAppraisalForm(categories: CategoryDef[], deps: AppraisalDeps) {
  const [category, setCategory] = useState(categories[0]);
  const [values, setValues] = useState<FormValues>(() => initialValues(categories[0]));
  const [shotUris, setShotUris] = useState<Record<string, string>>({});
  const [extraUris, setExtraUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // Minted when the form opens so a double-tap or a retry can never create a second submission.
  const [submissionId, setSubmissionId] = useState(() => deps.newId());
  const submitting = useRef(false);

  function reset(next = category) {
    setCategory(next);
    setValues(initialValues(next));
    setShotUris({});
    setExtraUris([]);
    setErrors({});
  }

  const photoItems = [
    ...category.photoShots.filter((s) => shotUris[s.key]).map((s) => ({ id: s.key, uri: shotUris[s.key] })),
    ...extraUris.map((uri, i) => ({ id: `extra-${i}`, uri })),
  ];
  const fields = coerceValues(category, values);
  const problems = validateSubmission(category, fields, photoItems.map((p) => p.id));

  async function submit(): Promise<SubmitResult> {
    if (submitting.current) return { status: 'skipped' };

    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    if (problems.length) return { status: 'skipped' };

    submitting.current = true;
    setBusy(true);
    try {
      const photos = await deps.preparePhotos(submissionId, photoItems);
      await deps.enqueue({
        id: submissionId,
        categoryId: category.id,
        schemaVersion: category.schemaVersion,
        fields,
        photos,
      });
      reset();
      setSubmissionId(deps.newId());
      return { status: 'saved' };
    } catch (e) {
      return { status: 'failed', error: e instanceof Error ? e.message : String(e) };
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return {
    category,
    selectCategory: (id: string) => {
      const next = categories.find((c) => c.id === id);
      if (next) reset(next);
    },
    values,
    setValue: (key: string, value: string | boolean) => setValues((prev) => ({ ...prev, [key]: value })),
    errors,
    shotUris,
    extraUris,
    pickShot: async (key: string, source: PhotoSource) => {
      const [uri] = await deps.pickPhotos(source, false);
      if (uri) setShotUris((prev) => ({ ...prev, [key]: uri }));
    },
    pickExtra: async (source: PhotoSource) => {
      const uris = await deps.pickPhotos(source, true);
      setExtraUris((prev) => [...prev, ...uris]);
    },
    busy,
    canSubmit: problems.length === 0,
    submit,
  };
}
