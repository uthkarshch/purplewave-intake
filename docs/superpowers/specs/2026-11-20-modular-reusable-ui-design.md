# Modular, reusable app structure: design

Status: implemented; deviations are listed at the end.

## Context

The outbox engine (`src/outbox/`) is already modular: store, transport, files adapter, triggers and processor are separate and injected, and `runtime.ts` wires them. The UI is not. `src/app/index.tsx` mixes form state, photo picking, validation, the submit flow and layout. Screens import the outbox through a module-level singleton, `category-form.tsx` switches on field type in one conditional, and UI primitives (`Button`, `theme`) sit beside feature components. Style blocks for panels, pills and chips repeat across three files.

## Goals

- Reuse: UI primitives and form logic usable by any screen without edits.
- Modularity: features with explicit public APIs and one-way dependencies.
- Testability: screens and hooks run against fakes, with no module mocking.
- Extensibility: a new field type or category needs one new file, not edits to existing ones.

## Non-goals

- No change to outbox behaviour, the server contract or `shared/`'s public API.
- No state library, no layered clean-architecture folders.
- No visual redesign.
- `src/api/naiveSubmit.ts` stays; the baseline repro test depends on it.

## Target structure

```
src/
  ui/                        reusable, no knowledge of appraisals
    theme.ts
    Button, Panel, Chip, Pill, SegmentedControl, FormField, EmptyState
    index.ts
  features/
    appraisal/               new-appraisal flow
      fields/                field-type registry and one renderer per type
      photos/                PhotoSlots and the picker
      useAppraisalForm.ts
      AppraisalScreen.tsx
      index.ts
    submissions/             list screen, status pill, pending banner
      index.ts
    outbox/                  existing engine, moved without behaviour change
      OutboxProvider.tsx
      runtime.ts             real composition root
      index.ts
  app/                       thin expo-router files that render feature screens
shared/                      unchanged
```

## Rules

1. `ui/` imports nothing from `features/`.
2. A feature exposes only its `index.ts`. Other code never imports from inside a feature folder.
3. `features/appraisal` and `features/submissions` may depend on `features/outbox`, never on each other.
4. Screens and components hold no business logic; hooks do.
5. `app/` files only re-export a screen.

## Components

### UI primitives (`src/ui`)

Extracted from styles that already repeat: `Panel` (tile), `Chip` (selectable pill), `Pill` (status, takes a tone), `SegmentedControl`, `FormField` (label, required mark, error line around any input), `EmptyState`. `Button` and `theme` move here. Each takes plain props and no domain types. Fonts and colours come only from `theme`.

### Field-type registry (`features/appraisal/fields`)

```ts
type FieldRendererProps<F extends FieldDef> = {
  field: F;
  value: string | boolean | undefined;
  error?: string;
  onChange: (value: string | boolean) => void;
};

const FIELD_RENDERERS: {
  [T in FieldDef['type']]: ComponentType<FieldRendererProps<Extract<FieldDef, { type: T }>>>;
};
```

The mapped type makes the compiler require a renderer for every field type in `shared/categories/types.ts`. `CategoryForm` becomes a loop that looks a renderer up by `field.type`. Adding a type means one renderer file and one map entry. Number sanitising stays in the number renderer, using the existing `sanitizeNumberInput`.

### Form hook (`features/appraisal/useAppraisalForm.ts`)

```ts
useAppraisalForm(categories: CategoryDef[], deps?: {
  enqueue, preparePhotos, pickPhotos, newId,
}): {
  category, selectCategory,
  values, setValue, errors,
  shotUris, extraUris, pickShot, pickExtra,
  busy, submit(): Promise<{ ok: true } | { ok: false; error: string }>,
}
```

It owns state, `coerceValues`, `validateSubmission`, the double-submit guard and the submission id minting. It never shows UI: `submit` returns a result and the screen alerts. `deps` default to the real implementations, so tests pass fakes. Behaviour matches today's `NewAppraisal`.

### Outbox provider (`features/outbox/OutboxProvider.tsx`)

`OutboxProvider` takes an outbox instance, defaulting to the one built in `runtime.ts`, and exposes `useOutbox()` (enqueue, retry) and `useOutboxRecords()`. Screens read the outbox from context. `startOutbox()` is called once from the root layout as today. The engine's code and its tests are untouched.

## Delivery

Each step ends with `tsc --noEmit` and the full Jest run passing before the next starts.

1. Move files into the structure above and fix imports. No logic change. Add an alias for `shared/` only if both `tsx` (server) and Jest honour it; otherwise keep relative imports.
2. Extract the `ui/` primitives and replace the repeated style blocks.
3. Add the field registry and rewrite `CategoryForm` on it.
4. Add `useAppraisalForm`; slim the screen to composition.
5. Add `OutboxProvider`; move existing tests from module mocks to provider fakes.

## Testing

- Existing suites keep passing at every step. This is the regression guard for the refactor.
- New: a registry test (every field type has a renderer, and a stub type is rendered through the map), hook tests with fake deps (validation errors, double-submit guard, success reset, enqueue failure result), provider tests (fake outbox reaches a screen), and snapshot-free render tests for each `ui/` primitive's variants.
- Outbox chaos and integration tests must stay green unchanged.

## Risks

- Moving files touches many imports at once. Step 1 is mechanical and verified before any logic moves.
- Jest has multiple projects and the server runs under `tsx`. A new path alias could break one of them, so it is optional and verified first.
- Splitting the form hook could subtly change submit timing. The hook keeps the same ref-based guard and the same order of operations, and the new hook tests pin it.

## Open questions

- Whether to delete `src/api/naiveSubmit.ts` and `/v0/submissions` later. `DECISIONS.md` says they should not ship, but the repro test needs them, so it is out of scope here.

## Deviations from the design as built

- `PendingBanner` lives in `features/outbox`, not `features/submissions`. The appraisal screen shows it, and rule 3 forbids appraisal depending on submissions.
- `preparePhotos` moved to `features/appraisal/photos/`: it runs at capture time and only produces the outbox's `EnqueueInput` photos.
- `OutboxProvider` takes a required `api` prop instead of defaulting to the real outbox, so importing it never loads native modules. The real `outboxApi` is built in `runtime.ts` and passed by `src/app/_layout.tsx`, the one composition root. `runtime.ts` no longer exports `outbox`, `enqueueSubmission` or `useOutboxRecords`.
- `useAppraisalForm` takes its `deps` as a required argument. `deps.ts` holds the native defaults (`nativeDeps`, without `enqueue`), and the screen adds `enqueue` from `useOutbox()`.
- `submit()` returns `{ status: 'saved' | 'skipped' } | { status: 'failed'; error }` instead of `{ ok }`, so a double tap or an invalid form is distinguishable from a failure.
- Added a `ui/Input` primitive, shared by the text and number renderers.
- `shared/` is imported through a `@shared/*` alias, which tsconfig, Jest (all three projects) and Metro all resolve. The server keeps its relative imports.
- Test helper `fakeOutboxApi` is exported from `features/outbox` so any feature test can inject a fake.
