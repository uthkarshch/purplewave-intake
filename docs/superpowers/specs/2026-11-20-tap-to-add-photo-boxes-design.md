# Tap-to-add photo boxes

## Intent
Remove the per-shot Camera / Library buttons. Each shot is a labelled box; tapping it chooses the photo source.

## Goals
- Shots render as dashed boxes in a row, label underneath, `*` on required shots.
- Tapping any box (empty or filled) opens a chooser: Camera, Library, Cancel. Choosing replaces that photo.
- Extra photos: one dashed "+ Extra" box using the same chooser; added extras show as thumbnails beside it.
- Per-shot validation errors still show under the box.

## Non-goals
- Grid layout, drag-to-reorder, removing photos, new dependencies.
- Changes to shot keys, required rules, server validation or the outbox.

## Constraints
- Only `src/components/photo-slots.tsx` changes; its props (`onPickShot`, `onPickExtra`) stay the same so `src/app/index.tsx` is untouched.

## Approaches
Only one fits: it removes the buttons without changing how photos are picked or validated.

## Calls made by the builder
- Chooser is a native `Alert` with buttons (works on iOS and Android, no new dependency).
- Extras get a single "+ Extra" box rather than two buttons.
