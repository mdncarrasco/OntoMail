---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. The add-on opens in Gmail and shows the home card**
  Becomes usable: Installing the add-on and opening an email shows the OntoMail home card — title, short Spanish explanation, and a Process email button (button not wired yet).
  Why now: Proves the whole Apps Script + Gmail Add-on + CardService + manifest path end to end on slice one, so every later behavior has a card to land in. Bootstraps the project (manifest, scopes, `.clasp.json`, `clasp push`).
  PRD ref: `prd.md > Screens and Layout` (Home card), `prd.md > The Core Journey` (1-2)
  Spec ref: `spec.md > File Structure`, `spec.md > Components` (HomeCard), `spec.md > Where It Runs and How Someone Tries It`
  Build: Scaffold `appsscript.json` (addOns.gmail trigger + oauthScopes for gmail addon, tasks, drive, external_request), `Code.gs` with the homepage/contextual trigger, `Cards.gs` with `buildHomeCard()`. Confirm Gemini model id/endpoint by reading OntoDistiller's `GeminiController.gs`. `clasp push` + test deployment.
  Verify (mechanical): `clasp push` succeeds with no errors; confirm via the Apps Script editor that the project has no syntax errors (e.g. run a trivial function or check the editor shows no errors).
  Learner check: Open an email in Gmail with OntoMail installed and confirm the home card appears as you pictured it (title, explanation, Process button).
  Commit: `Scaffold Gmail add-on with home card`

- [x] **2. Press Process and see the real ABox extracted from the email (the kernel)**
  Becomes usable: Pressing Process reads the open email, calls Gemini with the gist TBox, and renders the extracted ABox instances grouped by gist type with per-type accents (the parking lot). This is the unique kernel working for the first time.
  Why now: The Gemini→JSON-LD call and the gist term mapping are the two biggest risks (spec Decisions). Proving them early, with a real email, is the whole point of the project.
  PRD ref: `prd.md > Processing the current email`, `prd.md > Showing the extracted ABox`
  Spec ref: `spec.md > GeminiService`, `spec.md > TBox`, `spec.md > ResultsCard`, `spec.md > Data Model`, `spec.md > External Services and Dependencies`
  Build: Create `tbox.gs` — resolve the 5 gist class names against the chosen gist release first (spec Decisions investigation), write the TBox subset string. `GeminiService.gs` with `extractAbox(emailText)` (POST generateContent, `responseMimeType: application/json`, key from Script Properties). `onProcess(e)` in `Code.gs` reads the message and calls it. `buildResultsCard(abox)` renders the parking-lot rows grouped by gist type with accents.
  Verify (mechanical): `clasp push` succeeds; process a real email and confirm the response parses as JSON-LD and the resulting instances render under their gist types with accents (observe in Gmail / check logs for the parsed ABox).
  Learner check: Open an email with people/dates/commitments, press Process, and confirm the extracted instances appear correctly typed with their accents.
  Commit: `Add Gemini ABox extraction and parking-lot view`

- [x] **3. Select and edit actionables, then create real Google Tasks**
  Becomes usable: The results card shows commitments as actionables with a selection switch and editable title + due date; pressing Create tasks makes real Google Tasks and shows a confirmation. The demo kernel beat is complete.
  Why now: Completes the core journey's payoff. Depends on slice 2's ABox being real.
  PRD ref: `prd.md > Selecting, editing, and creating tasks`, `prd.md > The Core Journey` (4-6)
  Spec ref: `spec.md > ResultsCard`, `spec.md > TasksController`, `spec.md > External Services and Dependencies` (Tasks)
  Build: Extend `buildResultsCard` with the actionables section (switch + `TextInput` title + `DatePicker` due date per commitment, carried via action parameters). `onCreateTasks(e)` reads form inputs, creates one Google Task per selected actionable (title + optional RFC-3339 due), returns `buildConfirmationCard`. Enable the Tasks advanced service.
  Verify (mechanical): `clasp push` succeeds; select an actionable, edit its title, press Create tasks, and confirm the task appears in Google Tasks with the edited title/date.
  Learner check: Edit a task title, create it, and confirm it shows up in your Google Tasks exactly as edited.
  Commit: `Create Google Tasks from selected actionables`

- [x] **4. Handle the edge states: no actionables, and errors**
  Becomes usable: An informational email shows "Nada que accionar aquí"; an LLM failure or unparseable response shows a clear error card with a Reintentar button and creates/saves nothing.
  Why now: Makes the demo robust and matches the PRD states; cheap once the happy path works.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Important Failure Modes`, `spec.md > ResultsCard` (buildNoActionablesCard, buildErrorCard)
  Build: `onProcess` branches: ABox with no commitments → `buildNoActionablesCard` (knowledge shown, no actionables); Gemini throw / `JSON.parse` failure → `buildErrorCard` with Reintentar wired back to `onProcess`. Ensure nothing is created/saved on the error path.
  Verify (mechanical): Process a purely informational email and confirm the no-actionables message; force an error (bad key or malformed response) and confirm the error card + Reintentar appear and nothing is created.
  Learner check: Try an email with no tasks and confirm the "nada que accionar" message; confirm an error shows a retry button and creates nothing.
  Commit: `Add no-actionables and error states`

- [x] **5. Preserve the ABox to Drive**
  Becomes usable: A Preserve in Drive button writes a Markdown file to Drive with the ABox JSON-LD + a reference back to the source email, independent of task creation.
  Why now: The seed of the future enterprise ontology; last because it's optional and doesn't block the kernel.
  PRD ref: `prd.md > Preserving the ABox to Drive`
  Spec ref: `spec.md > DriveController`, `spec.md > Data Model`, `spec.md > External Services and Dependencies` (Drive)
  Build: `onPreserve(e)` reads the ABox from action parameters, builds Markdown (fenced JSON-LD + subject + email permalink), writes it into an OntoMail Drive folder (get-or-create), confirmation. Wire the Preserve button in `buildResultsCard`.
  Verify (mechanical): `clasp push` succeeds; press Preserve and confirm a Markdown file appears in Drive containing the ABox JSON-LD and the email reference.
  Learner check: Press Preserve, open the file in Drive, and confirm it holds the ABox and a link back to the email.
  Commit: `Add preserve ABox to Drive`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2 (the kernel: real ABox extracted from a real email). Confirmed working on a real Google Payments email: extracted Organizations, a Date, and an Amount (453.786 CLP), grouped by gist type with accents. Learner approved; no reshaping of slices 3-5 requested.
- [x] Final kick-the-tires exploration and feedback completed — learner ran the full flow in Gmail (process, parking lot, create tasks, no-actionables + error states, preserve to OntoMail folder) and confirmed ready. Feedback incorporated: Drive files grouped in an OntoMail folder; README added.

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — focused alternative: traced the switch-reading bug (cause → observable evidence → fix) and connected it to the Gemini 404/503 diagnosis
- [x] Optional edit and transfer reflection addressed — transfer question offered; no code edit (focused alternative, not a guided route)
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Focused alternative for an experienced plan-first learner. Traced the "No seleccionaste ningún compromiso" bug: assumption (switch in e.formInputs) → observable evidence (two selected, zero created) → fix (read flat e.formInput; add JSON.stringify(e) dump). Same practice applied to the Gemini 404/503. Evidence lives in devpost/checklist.md > Revisions and tests/form_inputs_check.js (pins both input shapes).
Route and stops: Reference route in app-map.html (not interactively toured): Stop 1 Code.gs > onProcess; Stop 2 GeminiService.gs > extractAbox + tbox.gs. Symbols verified against source.
Edit outcome: not applicable (focused alternative, no edit offered).
Reflection: transfer question offered ("what would you do differently next time with an agent?"); learner's answer, if given, kept in the ignored profile.
Activity mode: focused alternative (evidence-based), map prepared from finished code.

## Revisions

- Restored `appsscript.json` after `clasp create-script` overwrote it — clasp 3.x replaces the manifest with a bare default on project creation, wiping the add-on config, OAuth scopes, and the Tasks advanced service. Recovered from the slice-1 commit; `.clasp.json` now carries the real `scriptId`. (`6-ship` should confirm whether the scriptId should ship in a public repo.)
- Gemini HTTP 404 at first real call — the model path didn't resolve in `v1beta`. Made `extractAbox` tolerant of `GEMINI_MODEL` with or without the `models/` prefix, and made 404 errors name the model and point to ListModels instead of returning an empty body.
- Gemini HTTP 503 (model overloaded) on the free tier — added a small retry (up to 3 tries, 1s/2s backoff) on transient 503/429 in `extractAbox`, with a clearer message when it still fails. The 404 fix is confirmed working (the call now reaches the model).
- Selected commitments weren't detected ("No seleccionaste ningún compromiso") — the switch-reading assumed the structured `e.formInputs` shape. Rewrote `isSelected`/`readText`/`readDateMs` to read the flat `e.formInput` map first (the documented shape for switch/text/date widgets) with the structured map as fallback. Added a one-line event dump to `onCreateTasks` for diagnosis.
- Preserve failed with "permisos insuficientes para DriveApp.createFile" — the manifest used the restricted `drive.file` scope, but `DriveApp.createFile` requires the broad `auth/drive` scope. Switched the scope; spec updated.
- Final-review refinement: preserved ABox files now go into an "OntoMail" Drive folder (get-or-create, reused across saves) instead of the Drive root, so they form a single seed corpus for the enterprise ontology. PRD/spec updated to match.
