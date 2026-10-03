---
doc: prd
status: approved
---

# OntoMail — Product Requirements

One line: a Gmail Add-on that extracts the ontological ABox of the email you're viewing (typed against a gist TBox subset) and lets you turn the actionable parts into Google Tasks. For someone who lives in Gmail and keeps hand-converting emails into follow-ups.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey
Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. The user opens an email in Gmail and opens the OntoMail add-on panel.
2. The add-on shows a home card: the **OntoMail** title, a short explanation of what it does, and a **Process email** button.
3. The user presses **Process email**. The add-on shows a loading/processing indicator while it sends the email to the LLM with the gist TBox subset.
4. The LLM returns the email's ABox as JSON-LD. The add-on renders a **results card** with two parts:
   - **Extracted knowledge (parking lot):** every ABox instance shown as a row grouped by gist type, each with a type accent (color/emoji) and the instance's name — 👤 Person, 🏢 Organization, 📌 Commitment, 📅 Date, 💰 Amount.
   - **Actionables:** the commitments/tasks, each selectable, with an editable **title** and **due date**.
5. The user reviews, deselects anything they don't want, edits titles/dates as needed, and presses **Create tasks**.
6. The selected items are created as **Google Tasks**. The add-on shows a confirmation of what was created.
7. Optionally, at any point after processing, the user presses **Preserve in Drive** to save a Markdown file containing the ABox (embedded JSON-LD) plus a reference back to the source email.

## Screens and Layout
A single add-on panel in the Gmail sidebar (CardService), moving through card states:

- **Home card** — title "OntoMail", a one- or two-line explanation, and a primary **Process email** button.
- **Processing state** — a brief loading indicator after Process is pressed.
- **Results card** — two sections:
  - *Extracted knowledge*: rows grouped by gist type, each row = type accent (color/emoji) + instance name. This is the "parking lot" rendered in CardService's native widget vocabulary (not free-form colored tiles).
  - *Actionables*: one entry per commitment, each with a selection toggle, an editable title field, and an editable due-date field.
  - Buttons: **Create tasks** (primary) and **Preserve in Drive** (secondary).
- **Confirmation state** — after creating tasks, a short summary of what was created.
- **No-actionables state** — if the ABox has no commitments: show the extracted knowledge and a clear "Nada que accionar aquí" message, no actionables section.
- **Error state** — if the LLM call fails or returns unparseable output: a clear error message and a **Reintentar** (retry) button; nothing is created or saved.

## Look and Feel
A quiet, trustworthy assistant inside Gmail — clean, uncluttered, legible. The user stays in control; the extracted knowledge is easy to scan. Visual identity carried by **per-type accents** (a color and/or emoji per gist type) rather than custom-drawn tiles, working within CardService's native widgets. No heavy styling, no free-form HTML canvas for the PoC.

## Features and Behavior

### Processing the current email
Develops `scope.md > The Core Loop`.
- The add-on acts on the single email currently open in Gmail.
- Pressing **Process email** sends the email content plus the gist TBox subset to the LLM and expects an ABox as JSON-LD in return.
  - [ ] After pressing Process, a loading indicator is visible until results or an error appear.
  - [ ] On success, the results card renders with extracted instances.

### Showing the extracted ABox (parking lot)
Develops `scope.md > The Unique Kernel`.
- ABox instances are grouped by gist type and shown as rows with a type accent + name.
- Types in scope: Person, Organization, Commitment/Task, Date, Amount.
  - [ ] Each returned instance appears under its gist type with the correct accent and its name.
  - [ ] If a type has no instances, that group is simply absent (no empty group shown).

### Selecting, editing, and creating tasks
Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.
- Commitments appear in the Actionables section, each selectable, with an editable title and due date.
- Pressing **Create tasks** creates one Google Task per selected actionable using the (possibly edited) title and due date.
  - [ ] The user can deselect an actionable so it is not created.
  - [ ] The user can edit a title and a due date before creating.
  - [ ] After Create tasks, the created tasks are present in the user's Google Tasks.
  - [ ] A confirmation lists what was created.

### Preserving the ABox to Drive
Develops `scope.md > The POC Boundary` (preserve = Markdown in Drive).
- **Preserve in Drive** is an optional, separate action (independent of creating tasks).
- It writes a Markdown file into an **OntoMail folder** in the user's Drive (created on first use, reused after) containing the ABox as embedded JSON-LD plus a reference (subject/link) back to the source email. Grouping all preserved ABox files in one folder makes them the seed corpus of the future enterprise ontology.
  - [ ] Pressing Preserve creates a Markdown file in Drive with the ABox JSON-LD and the email reference.
  - [ ] Preserving does not require creating tasks, and creating tasks does not require preserving.

## States and Boundaries
- **First use / home** — title, explanation, Process button; nothing extracted yet.
- **Processing** — loading indicator shown while the LLM call is in flight.
- **Success with actionables** — extracted knowledge + actionables + Create/Preserve buttons.
- **Success without actionables** — extracted knowledge shown; "Nada que accionar aquí"; no actionables section.
- **Error** — clear message + Reintentar button; nothing created or saved.
- **Persistence** — nothing is stored automatically; the only persistence is the optional Drive Markdown file the user chooses to create.

## Product Decisions
- **Parking lot = native CardService rows with per-type color/emoji accents, grouped by type** — faithful to the "parking lot with colors and names" idea without fighting the platform or rendering custom HTML (keeps the PoC small). [Assumption to confirm in `4-spec`: exact accent treatment.]
- **Edit only title + due date for the PoC** — enough to make a useful task; other commitment fields (associated person, amount) are shown in the parking lot but not editable now.
- **No-actionables → "Nada que accionar aquí"** — avoids a confusing empty state when the email is purely informational.
- **LLM failure → clear message + Reintentar, nothing created/saved** — never leave half-created tasks or partial saves.
- **Preserve in Drive is an optional, separate button** — keeps preserving and task-creation as distinct, clear actions; the demonstrable kernel stays "ABox → task".
- **Output format is JSON-LD** — valid JSON (parses natively in Apps Script) while keeping gist typing/semantics. (From `scope.md`.)

## What We're Building
- Gmail Add-on home card: title + explanation + Process button.
- Process action: send email + gist TBox subset to LLM, get ABox JSON-LD back, with loading and error handling.
- Results card: parking-lot view of extracted instances grouped by gist type with accents; actionables section with selection + editable title/date.
- Create tasks: selected actionables become Google Tasks; confirmation shown.
- Preserve in Drive: optional Markdown file with ABox JSON-LD + email reference.
- Edge states: no-actionables message, error + retry.

## Deferred From the POC
- **Calendar events and other action types** — PoC proves Tasks only.
- **Editing commitment fields beyond title + date** — shown but not editable yet.
- **A real persistent knowledge graph / enterprise ontology store** — the Drive Markdown file is the seed, not the graph.
- **Full gist TBox** — PoC uses a hand-picked subset.
- **Deduplication / linking instances across emails** — single-email loop only.

## Possible Later Enhancements
- Evolve the preserved ABox files into an actual enterprise ontology / knowledge graph.
- Calendar events, richer action types, and more editable fields.
- Smarter type coverage as the gist subset grows toward the full TBox.

## Non-Goals
- **Auto-creating tasks without review** — user control is part of the kernel's value.
- **Inbox-wide / batch processing** — one email at a time; batching is scope creep.
- **Marketplace deployment/publishing** — a working add-on in the learner's own Gmail is enough to demo.

## Open Questions
- Exact gist TBox subset (which gist classes/properties map to Person, Organization, Commitment, Date, Amount) — resolve in `4-spec`. Does not block PRD approval.
- Which LLM/provider and how it's called from Apps Script — `4-spec` decision. Does not block PRD approval.
