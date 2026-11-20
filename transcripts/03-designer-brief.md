# Session 3: brief for a UI/UX designer

Prompts, tool actions and visible replies. Reasoning traces and tool output are not included.

Tool: GitHub Copilot agent (VS Code agent host).

---

## Turn 1 — 2026-11-19 18:52 UTC

### Prompt

> How do i explain this project to a UI/UX designer and ask for designs, i want a detailed copy paste friendly version

### Actions taken

- rename_chat: Designer brief for project
- bash: List files, README and package.json
- bash: Read decisions and UI files
- bash: Read categories, contract, outbox types
- bash: Read UI files and decision headings
- bash: Read decisions excerpts, theme, button, validation

### Response

Here is a brief you can paste into a message or doc for the designer. I based it on the app's actual screens, fields, statuses and theme in the repo.

---

# Design Brief: Purple Wave Intake (mobile app)

## 1. What this is
Purple Wave Intake is a mobile app (iOS and Android, built in Expo/React Native) for **heavy-equipment dealers**. A dealer photographs a machine, fills in its details and submits it to Purple Wave for **appraisal**.

The twist is that dealers often work in places with **bad or no connectivity**, such as lots, farms and job sites. The app must never lose or duplicate a submission. When the dealer taps submit, the appraisal is saved on the phone and uploads in the background, retrying automatically. **Most of the design challenge is making this "saved, uploading later" state clear and trustworthy.**

## 2. Users and context
- **Who:** equipment dealers and their staff, not necessarily tech-savvy.
- **Where:** outdoors, standing next to a machine. This means bright sun, gloves or dirty hands, one-handed use, and patchy signal.
- **Device:** mostly phones. One-handed, portrait use is the priority.
- **Goal:** get a machine appraised quickly (about 2–5 minutes per machine) without worrying whether it went through.
- **Fears:** "Did it send?", "Did I lose my photos?", "Will it submit twice?"

## 3. Design goals
1. **Speed:** fewest taps to capture photos and enter data.
2. **Confidence:** the dealer always knows the state of every submission.
3. **Outdoor legibility:** high contrast, large touch targets (min 44–48px), readable in sunlight.
4. **Calm offline behaviour:** offline is a normal state, not an error.
5. **Extensible:** new equipment categories are coming. Tractors are the second category and more will follow, so the UI must adapt to any category without a redesign.

## 4. Screens in scope

### 4.1 New Appraisal (home screen)
Top to bottom:
- **Pending banner** (only appears when needed). It shows "X waiting to upload", "Y need attention", or both ("2 waiting to upload · 1 need attention"). Tapping it opens Submissions.
- **Category switcher:** segmented tabs (Excavator | Tractor | future categories). Switching resets the form.
- **Details form**, generated from the category definition.
- **Photos section**, with required and optional shots plus extra photos.
- **Primary CTA:** "Submit for appraisal". It shows "Saving…" while busy and is disabled in that state.
- **Success feedback:** after submit, a confirmation says the appraisal is queued and will upload automatically even if the connection drops. The form then resets.

### 4.2 Submissions (status list)
A history list, newest first. Each row has:
- A title (serial number, falling back to make).
- A status pill.
- Photo progress ("3/5 photos uploaded").
- A "Retry now" button when something failed or is waiting to retry.

It also needs an **empty state** ("No submissions yet. Saved appraisals appear here while they upload.").

## 5. Form fields by category (design for variety)
Field types the UI must support: **text** (single or multiline), **number** (with unit suffix, e.g. h), **select** (chips), **boolean** (toggle).

**Excavator**

| Field | Type | Required |
|---|---|---|
| Make | text | yes |
| Model | text | yes |
| Year | number (1950–2100) | yes |
| Serial number | text | yes |
| Hours | number (h) | yes |
| Undercarriage | select: good / fair / poor | yes |
| Condition notes | multiline text | no |

Photos: Front (required), Hour meter (required), Serial plate (optional), plus unlimited extra photos.

**Tractor**

| Field | Type | Required |
|---|---|---|
| Make | text | yes |
| Model | text | yes |
| Year | number | yes |
| Serial number | text | yes |
| Engine hours | number (h) | yes |
| PTO hours | number (h) | no |
| Hitch type | select: 3-point / drawbar / both | yes |
| Four-wheel drive | toggle | no |
| Condition notes | multiline text | no |

Photos: Front (required), Hour meter (required), PTO shaft (required), Tires (optional), plus extra photos.

**Please design for 2 categories now and show how a 3rd would slot in.** The category switcher should still work if there are 5+ categories.

## 6. Photo capture UX
Each required or optional "shot" is a slot with a thumbnail (empty placeholder until filled), a label with a required marker, an inline error if missing, and two actions: **Camera** or **Library**. Below the slots is an "Extra photos" area with a thumbnail grid and "Add from camera / library" buttons.

Ideas I'd like you to explore:
- Guided capture, such as an overlay or hint showing what a good "hour meter" or "serial plate" shot looks like.
- A clear done/not-done progress indicator ("2 of 3 required photos").
- Retake and remove flows (currently missing).
- Photo thumbnails with a quality or upload-state indicator.

## 7. Submission states (the key part)
Each submission moves through these states. Please design a clear visual language (colour + icon + copy) for each:

| State | Meaning | Current tone |
|---|---|---|
| **Queued** | Saved on the phone, waiting to upload | Amber |
| **Waiting to retry** | An upload attempt failed (e.g. offline); will auto-retry | Amber |
| **Uploading** | Creating, uploading photos or finalizing | Blue |
| **Submitted** | Delivered and confirmed | Green |
| **Needs attention** | Automatic retry won't fix it (e.g. a photo file went missing) | Red |

Also design:
- The **banner** in its three variants: waiting only, needs attention only, and both.
- A **per-submission progress** treatment (photos x/y uploaded), possibly with a progress bar.
- A **Needs attention** detail with a plain-language reason and a clear next action (Retry / Retake photo).
- A **global offline indicator**. For example, a subtle "You're offline. Submissions will upload when you're back online" so offline reads as safe, not broken.

## 8. Validation and error handling
- Required fields are marked with `*`.
- Inline errors sit under each field (e.g. "Year must be at least 1950", "Hour meter photo is required"), and the input border turns red.
- Show all errors on submit. Consider scrolling to the first error.
- Number fields only accept valid numeric input.
- Error copy should be short, human and actionable.

## 9. Current visual identity (starting point, open to evolution)
- **Palette:** mint/forest green. Page background is white; cards are light mint `#EAF9E7`; text is deep teal `#013237`; muted text is `#4B6467`; primary green is `#4CA771`; accent text green is `#1F7A4A`; borders are `#C0E6BA` / `#7FB08A`.
- **Status colours:** ok `#14633A` on `#D6F0D0`; warning `#8A5A00` on `#FBEBC8`; info `#1F4F8F` on `#E1EBF8`; danger `#B3261E` on `#FBE1DF`.
- **Typography:** Urbanist, Regular (400) and Medium (500). Sizes: title 24, body 16, label 14, small 13.
- **Shape:** radius 10 (inputs), 16 (cards and buttons), pill for chips and status.
- **Components:** primary and secondary buttons (regular 52px, compact 44px), segmented tabs, chips, status pills, cards, banner, switch.

You can keep this direction or propose a stronger one. Please check contrast in outdoor lighting, and don't rely on colour alone to show state (use icons and text too).

## 10. Deliverables requested
1. **Mobile hi-fi designs (iPhone and Android sizes)** for:
   - New Appraisal: empty, partially filled, error and success states, for both Excavator and Tractor.
   - Photo capture and slot states: empty, filled, error, and the extra photos grid.
   - Submissions list: all 5 states, empty state, and retry flow.
   - Banner variants and the offline indicator.
2. **Key flows:**
   - Happy path: fill, add photos, submit, confirmation.
   - Offline path: submit offline, see the queued state, reconnect, see it become submitted.
   - Failure path: needs attention, then retry or retake photo.
3. **Component library / design tokens:** colours, type scale, spacing, radius, buttons, inputs, chips, pills, banners, photo slots.
4. **Tablet or landscape considerations** (nice to have).
5. **Light and dark mode** (nice to have; outdoor readability comes first).
6. **Accessibility notes:** touch targets of at least 44px, contrast of at least WCAG AA, screen-reader labels, and dynamic type support.
7. **Annotated handoff** in Figma, with spacing, states and interaction notes.

## 11. Constraints and notes
- The form is **generated from a category definition**, so designs should work for any list of fields and photo shots, not one hard-coded layout.
- Submissions can't be edited once queued, so there is no edit screen.
- There is no login or auth in this version.
- Photos are resized and compressed before upload, so large files shouldn't be a concern in the UI.
- Drafts aren't saved if the app is killed. If you think this needs UI, flag it as a future consideration.
- **The app has not yet been verified on a physical device.** Expect small layout adjustments during implementation.

## 12. Questions I'd love your input on
- How can we reassure dealers that a queued submission is safe without making it feel unfinished?
- What's the best way to guide photo capture so appraisers get usable images the first time?
- Should "Submissions" be a separate screen, a tab, or a bottom sheet?
- How should the UI scale from 2 categories to 10+?

---

**Optional extras to send with it:**
- Screenshots of the current app from Expo Go. I haven't run it on a device, so these would need to come from you.
- Which three user flows matter most to you, so the designer can prioritise them.

I can also trim this into a one-page version or a Figma-ready checklist.
