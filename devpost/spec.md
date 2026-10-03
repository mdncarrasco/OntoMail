---
doc: spec
status: approved
---

# OntoMail — Technical Spec

## How This Works, In Plain Language
OntoMail is a **Gmail Add-on** written in **Google Apps Script**. An add-on is a small panel that Google draws inside Gmail using a set of pre-built widgets called **CardService** — you describe cards, sections, buttons and text, and Google renders them in the sidebar. No HTML, no web server; the whole thing runs on Google's servers when you open it.

The pieces:
- **The add-on UI (cards)** — the home card (title + explanation + Process button) and the results card (extracted instances + actionables). Built with CardService.
- **The Gemini call** — when you press Process, the add-on reads the open email, builds a prompt that includes a small **TBox** (a slice of the gist ontology describing the types we care about), and sends it to Google's **Gemini** API over the internet using `UrlFetchApp`. Gemini is asked to reply with **JSON-LD** (valid JSON), which is the email's **ABox** — the actual instances it found.
- **The TBox file (`tbox.gs`)** — a hand-picked subset of gist, kept as a string in the code so it's easy to edit and version as it grows.
- **Google Tasks** — selected actionables become real tasks via the Tasks API.
- **Google Drive** — the optional "Preserve" button writes a Markdown file with the ABox and a link back to the email.

Why this shape: it reuses the exact pattern already proven in the sibling project OntoDistiller (Gmail Add-on + Gemini via `UrlFetchApp` + Script Properties for the key), so there are no new frameworks and nothing to deploy. Gemini's JSON mode makes parsing the ABox trivial.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. User opens an email and the OntoMail panel → Gmail fires the add-on's homepage/contextual trigger → `buildHomeCard()` returns the home card.
2. User presses **Process email** → an action handler runs `onProcess(e)`.
3. `onProcess` reads the current message (`GmailApp` / the add-on message token), extracts subject + plain-text body.
4. It builds the prompt: system instruction + the gist TBox subset (from `tbox.gs`) + the email text, and calls `GeminiService.extractAbox(emailText)`.
5. `GeminiService` POSTs to Gemini `generateContent` with `responseMimeType: "application/json"`, gets back JSON-LD text, `JSON.parse`s it into the ABox object.
6. `onProcess` passes the ABox to `buildResultsCard(abox)` → the parking-lot rows (grouped by gist type) + the actionables section (selectable, editable title/date).
7. User edits/deselects → presses **Create tasks** → `onCreateTasks(e)` reads the form inputs and creates one Google Task per selected actionable → `buildConfirmationCard(created)`.
8. (Optional, any time after processing) User presses **Preserve in Drive** → `onPreserve(e)` writes a Markdown file to Drive with the ABox JSON-LD + email reference.
9. On failure anywhere in 4–5 → `buildErrorCard()` with a Reintentar button; nothing created or saved.

## Stack
- **Google Apps Script** (V8 runtime) — the whole app. [Docs: https://developers.google.com/apps-script]
- **Gmail Add-on / CardService** — the UI and Gmail integration. [Docs: https://developers.google.com/apps-script/add-ons/cards]
- **Gemini API** via `UrlFetchApp` — the LLM. `generateContent` with `responseMimeType: application/json`. [Docs: https://ai.google.dev/gemini-api/docs/text-generation ; structured output: https://ai.google.dev/gemini-api/docs/structured-output]
- **Google Tasks** — via the advanced Tasks service or Tasks REST API. [Docs: https://developers.google.com/tasks/reference/rest]
- **Google Drive** (`DriveApp`) — the preserve step. Scope: `auth/drive` (DriveApp.createFile requires the broad scope; `drive.file` is rejected for generic file creation). [Docs: https://developers.google.com/apps-script/reference/drive]
- **clasp** — local dev / push, same as sibling projects. [Docs: https://github.com/google/clasp]
- Rationale: reuse the OntoDistiller pattern verbatim (learner's own, proven) → zero new dependencies, no deployment. Accepted tradeoff: CardService's fixed widget vocabulary means the "parking lot" is rows with per-type accents, not free-form colored tiles (agreed in `prd.md`).

**To verify early in the build:** exact Gemini model id and endpoint currently used in Ontodistiller's `GeminiController.gs`; current gist term names (gist renamed e.g. `gist:Task` → `gist:TaskExecution` and moved IRIs to `w3id.org/semanticarts/ontology/gistCore#`). See Decisions.

## Where It Runs and How Someone Tries It
- Runs entirely on Google's servers as a Gmail Add-on; no local runtime. Requires a Google account, a Gemini API key (stored in **Script Properties**, never in code), and the add-on installed/deployed to the developer's own Gmail (test deployment is enough).
- **Setup:** `clasp push` the project to an Apps Script project, set `GEMINI_API_KEY` in Script Properties, install the add-on as a test deployment, open Gmail.
- **Demo recording:** open a real email containing a commitment, open OntoMail, press Process, show the extracted ABox + actionables, edit a title, press Create tasks, then show the new task in Google Tasks. Optionally press Preserve and show the Drive file.
- Submission needs a short demo video + a public GitHub repo. Deployment to the Workspace Marketplace is a Non-Goal (`prd.md`); a test deployment in the learner's own Gmail is enough.

## Look and Feel
Carried from `prd.md > Look and Feel`. Quiet, trustworthy, legible. Visual identity via **per-type accents** within CardService: each gist type gets a color/emoji accent used on its parking-lot rows (👤 Person, 🏢 Organization, 📌 Commitment, 📅 Date, 💰 Amount). Use `DecoratedText` with an icon/emoji and the instance name; group by type with `CardSection` headers. No custom HTML. Interface copy in Spanish, short and plain.

## Components

### HomeCard (`Code.gs` / `Cards.gs`)
Builds the home card: OntoMail title, short explanation, **Process email** button wired to `onProcess`.
PRD ref: `prd.md > Screens and Layout` (Home card), `prd.md > The Core Journey` (1–2).

### ProcessController (`Code.gs`)
`onProcess(e)`: reads the current email, calls `GeminiService.extractAbox`, routes to results / no-actionables / error cards. Shows a processing notification/loading state.
PRD ref: `prd.md > Processing the current email`.

### GeminiService (`GeminiService.gs`)
`extractAbox(emailText)`: builds prompt (system instruction + TBox from `tbox.gs` + email), POSTs to Gemini with JSON output mode, parses JSON-LD, returns the ABox object (or throws on failure/unparseable). Key from Script Properties.
PRD ref: `prd.md > Processing the current email`, `prd.md > Showing the extracted ABox`.

### TBox (`tbox.gs`)
Exports the gist TBox subset as a string (JSON-LD `@context` + class/property descriptions) injected into the prompt. The one place the ontology subset is edited as it grows.
PRD ref: `prd.md > Showing the extracted ABox`.

### ResultsCard (`Cards.gs`)
`buildResultsCard(abox)`: parking-lot section (rows grouped by gist type with accents) + actionables section (per commitment: selection switch, editable title `TextInput`, editable due date `DatePicker`). Buttons: Create tasks, Preserve in Drive. Also `buildNoActionablesCard`, `buildErrorCard`, `buildConfirmationCard`.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Showing the extracted ABox`, `prd.md > States and Boundaries`.

### TasksController (`Code.gs`)
`onCreateTasks(e)`: reads form inputs (which actionables selected, edited title/date), creates one Google Task each via the Tasks service, returns confirmation.
PRD ref: `prd.md > Selecting, editing, and creating tasks`.

### DriveController (`Code.gs`)
`onPreserve(e)`: writes a Markdown file to Drive with the ABox JSON-LD (fenced block) + email reference (subject + permalink). Independent of task creation.
PRD ref: `prd.md > Preserving the ABox to Drive`.

## Data Model
No persistent app state. Data flows through one request:
- **Email text** — originates from the open Gmail message (read at Process time). Not stored.
- **ABox** — produced by Gemini as JSON-LD, held in memory for the card render, and passed through action events (serialized in the card's form/action parameters so later handlers can read it). Lost when the card is dismissed, unless preserved.
- **Google Tasks** — created in the user's default task list; persist in Google Tasks.
- **Drive Markdown file** — the only app-authored persistence, created only when the user presses Preserve.

ABox shape (JSON-LD): `@context` for the gist subset, and a `@graph` array of instances, each with `@id`, `@type` (a gist class), a human `name`/`label`, and type-specific fields (commitments carry a title + optional due date + optional associated person/amount).

## File Structure
```
OntoMail/
├── appsscript.json          # manifest: addOns.gmail trigger, oauthScopes (gmail addon, tasks, drive, external_request)
├── Code.gs                  # entry triggers + action handlers (onProcess, onCreateTasks, onPreserve)
├── Cards.gs                 # CardService builders (home, results, no-actionables, error, confirmation)
├── GeminiService.gs         # Gemini call + JSON-LD parse
├── tbox.gs                  # gist TBox subset (string injected into the prompt)
├── .clasp.json              # clasp project binding
├── devpost/                 # Devpost learning workspace (scope, prd, spec, ...)
└── README.md
```

## External Services and Dependencies
- **Gemini API** — `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<KEY>`. Payload: `contents` (the prompt), `generationConfig: { responseMimeType: "application/json" }`. Response: candidates → content → parts[0].text = JSON-LD string. Key in Script Properties. Watch rate limits / model availability on the free tier. [Docs: https://ai.google.dev/gemini-api/docs/structured-output] — confirm exact model id against OntoDistiller.
- **Google Tasks API** — create task: `Tasks.Tasks.insert({ title, due }, taskListId)` via the advanced service, or `POST https://tasks.googleapis.com/tasks/v1/lists/@default/tasks`. `due` is RFC 3339. [Docs: https://developers.google.com/tasks/reference/rest/v1/tasks/insert]
- **Google Drive** — `DriveApp.createFile(name, content, 'text/markdown')`. [Docs: https://developers.google.com/apps-script/reference/drive/drive-app#createfilename,-content,-mimetype]
- **gist ontology** — source of the TBox subset. Persistent IRI base `https://w3id.org/semanticarts/ontology/gistCore#`. [https://github.com/semanticarts/gist] — verify current class names at build time.

## Important Failure Modes
- **Gemini call fails / times out** → error card with a clear message + **Reintentar** button; nothing created or saved. (`prd.md > States and Boundaries`.)
- **Gemini returns non-JSON / unparseable** → same error card (treat `JSON.parse` failure as a processing error). Consider one logged raw-response for debugging.
- **ABox has no commitments** → no-actionables card: show extracted knowledge + "Nada que accionar aquí", no actionables section. (`prd.md`.)
- **Actionable missing a due date** → create the task with title only (due date optional in Tasks).

## What Was Simplified and Why
- **gist TBox subset in a prompt string** instead of loading/reasoning over the full gist ontology — the full ontology (~100 classes) is far more than the PoC needs and would bloat the prompt. The subset covers the 5 target types. The fuller version would load gist from its IRI and map more classes.
- **ABox passed through card action parameters** instead of a datastore — no persistence infrastructure for a single-email loop. Preserve-to-Drive is the deliberate seed of the future graph.
- **Per-type accent rows** instead of custom colored tiles — stays within CardService; agreed in PRD.

## Decisions and Open Issues
- **LLM = Gemini via `UrlFetchApp`, same pattern as OntoDistiller** (learner choice) — reuse proven code, no new deps. Tradeoff: free-tier rate/model limits.
- **TBox subset defined by the agent, lives in `tbox.gs`** (learner delegated the subset definition; chose the file). Mapping: Person→`gist:Person`, Organization→`gist:Organization`, Commitment/Task→`gist:Obligation`/`gist:Commitment` (or `gist:TaskExecution` — pick the canonical one at build), Date→gist temporal (`gist:Event` + date property, or `gist:TimeInterval`), Amount→`gist:Magnitude` (monetary). **Agent uncertainty flagged honestly:** gist renamed several classes and changed IRIs across releases; I verified the namespace and the renaming direction via Semantic Arts/GitHub but did NOT pin exact current term names. **Investigation during build:** open the gist release the learner wants (or the sibling projects' ontology files) and confirm each of the 5 class names before finalizing `tbox.gs`. Evidence: the resolved class IRIs written into `tbox.gs`.
- **Output = JSON-LD via Gemini JSON mode** (from PRD) — valid JSON, native parse, keeps gist typing.
- **One learner uncertainty surfaced:** the exact gist term mapping (above) — the genuinely ontological decision — resolved by a short build-time verification against the chosen gist release rather than guessing now. **RESOLVED (slice 2):** verified against `ontologies/gistCore.ttl` on the gist GitHub repo (current release). Canonical mapping: Person→`gist:Person`, Organization→`gist:Organization`, Commitment/Task→`gist:Commitment` (the obligation that arises from the email; `gist:Task` also exists but Commitment better fits "a promise in an email"), Date→`gist:TimeInterval` (gist models time as intervals), Amount→`gist:Magnitude`. Note: `gist:Obligation` and `gist:MonetaryAmount` do NOT exist in current gist; the earlier `gist:Task`→`gist:TaskExecution` rename seen in intermediate release notes is not in the current core (gist:Task is present). Namespace: `https://w3id.org/semanticarts/ontology/gistCore#`.
- **Open (non-blocking):** exact Gemini model id/endpoint — read from OntoDistiller's `GeminiController.gs` at build start.
