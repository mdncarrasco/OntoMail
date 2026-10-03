---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. The add-on opens in Gmail and shows the home card**
  Becomes usable: Installing the add-on and opening an email shows the OntoMail home card — title, short Spanish explanation, and a Process email button (button not wired yet).
  Why now: Proves the whole Apps Script + Gmail Add-on + CardService + manifest path end to end on slice one, so every later behavior has a card to land in. Bootstraps the project (manifest, scopes, `.clasp.json`, `clasp push`).
  PRD ref: `prd.md > Screens and Layout` (Home card), `prd.md > The Core Journey` (1-2)
  Spec ref: `spec.md > File Structure`, `spec.md > Components` (HomeCard), `spec.md > Where It Runs and How Someone Tries It`
  Build: Scaffold `appsscript.json` (addOns.gmail trigger + oauthScopes for gmail addon, tasks, drive, external_request), `Code.gs` with the homepage/contextual trigger, `Cards.gs` with `buildHomeCard()`. Confirm Gemini model id/endpoint by reading OntoDistiller's `GeminiController.gs`. `clasp push` + test deployment.
  Verify (mechanical): `clasp push` succeeds with no errors; confirm via the Apps Script editor that the project has no syntax errors (e.g. run a trivial function or check the editor shows no errors).
  Learner check: Open an email in Gmail with OntoMail installed and confirm the home card appears as you pictured it (title, explanation, Process button).
  Commit: `Scaffold Gmail add-on with home card`

- [ ] **2. Press Process and see the real ABox extracted from the email (the kernel)**
  Becomes usable: Pressing Process reads the open email, calls Gemini with the gist TBox, and renders the extracted ABox instances grouped by gist type with per-type accents (the parking lot). This is the unique kernel working for the first time.
  Why now: The Gemini→JSON-LD call and the gist term mapping are the two biggest risks (spec Decisions). Proving them early, with a real email, is the whole point of the project.
  PRD ref: `prd.md > Processing the current email`, `prd.md > Showing the extracted ABox`
  Spec ref: `spec.md > GeminiService`, `spec.md > TBox`, `spec.md > ResultsCard`, `spec.md > Data Model`, `spec.md > External Services and Dependencies`
  Build: Create `tbox.gs` — resolve the 5 gist class names against the chosen gist release first (spec Decisions investigation), write the TBox subset string. `GeminiService.gs` with `extractAbox(emailText)` (POST generateContent, `responseMimeType: application/json`, key from Script Properties). `onProcess(e)` in `Code.gs` reads the message and calls it. `buildResultsCard(abox)` renders the parking-lot rows grouped by gist type with accents.
  Verify (mechanical): `clasp push` succeeds; process a real email and confirm the response parses as JSON-LD and the resulting instances render under their gist types with accents (observe in Gmail / check logs for the parsed ABox).
  Learner check: Open an email with people/dates/commitments, press Process, and confirm the extracted instances appear correctly typed with their accents.
  Commit: `Add Gemini ABox extraction and parking-lot view`

- [ ] **3. Select and edit actionables, then create real Google Tasks**
  Becomes usable: The results card shows commitments as actionables with a selection switch and editable title + due date; pressing Create tasks makes real Google Tasks and shows a confirmation. The demo kernel beat is complete.
  Why now: Completes the core journey's payoff. Depends on slice 2's ABox being real.
  PRD ref: `prd.md > Selecting, editing, and creating tasks`, `prd.md > The Core Journey` (4-6)
  Spec ref: `spec.md > ResultsCard`, `spec.md > TasksController`, `spec.md > External Services and Dependencies` (Tasks)
  Build: Extend `buildResultsCard` with the actionables section (switch + `TextInput` title + `DatePicker` due date per commitment, carried via action parameters). `onCreateTasks(e)` reads form inputs, creates one Google Task per selected actionable (title + optional RFC-3339 due), returns `buildConfirmationCard`. Enable the Tasks advanced service.
  Verify (mechanical): `clasp push` succeeds; select an actionable, edit its title, press Create tasks, and confirm the task appears in Google Tasks with the edited title/date.
  Learner check: Edit a task title, create it, and confirm it shows up in your Google Tasks exactly as edited.
  Commit: `Create Google Tasks from selected actionables`

- [ ] **4. Handle the edge states: no actionables, and errors**
  Becomes usable: An informational email shows "Nada que accionar aquí"; an LLM failure or unparseable response shows a clear error card with a Reintentar button and creates/saves nothing.
  Why now: Makes the demo robust and matches the PRD states; cheap once the happy path works.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Important Failure Modes`, `spec.md > ResultsCard` (buildNoActionablesCard, buildErrorCard)
  Build: `onProcess` branches: ABox with no commitments → `buildNoActionablesCard` (knowledge shown, no actionables); Gemini throw / `JSON.parse` failure → `buildErrorCard` with Reintentar wired back to `onProcess`. Ensure nothing is created/saved on the error path.
  Verify (mechanical): Process a purely informational email and confirm the no-actionables message; force an error (bad key or malformed response) and confirm the error card + Reintentar appear and nothing is created.
  Learner check: Try an email with no tasks and confirm the "nada que accionar" message; confirm an error shows a retry button and creates nothing.
  Commit: `Add no-actionables and error states`

- [ ] **5. Preserve the ABox to Drive**
  Becomes usable: A Preserve in Drive button writes a Markdown file to Drive with the ABox JSON-LD + a reference back to the source email, independent of task creation.
  Why now: The seed of the future enterprise ontology; last because it's optional and doesn't block the kernel.
  PRD ref: `prd.md > Preserving the ABox to Drive`
  Spec ref: `spec.md > DriveController`, `spec.md > Data Model`, `spec.md > External Services and Dependencies` (Drive)
  Build: `onPreserve(e)` reads the ABox from action parameters, builds Markdown (fenced JSON-LD + subject + email permalink), `DriveApp.createFile(name, content, 'text/markdown')`, confirmation. Wire the Preserve button in `buildResultsCard`.
  Verify (mechanical): `clasp push` succeeds; press Preserve and confirm a Markdown file appears in Drive containing the ABox JSON-LD and the email reference.
  Learner check: Press Preserve, open the file in Drive, and confirm it holds the ABox and a link back to the email.
  Commit: `Add preserve ABox to Drive`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (the kernel: real ABox extracted from a real email), where feedback can still reshape slices 3-5
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [pending]
Route and stops: [pending]
Edit outcome: [pending]
Reflection: [pending]
Activity mode: [pending]

## Revisions
