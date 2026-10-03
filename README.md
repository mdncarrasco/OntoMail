# OntoMail

A Gmail Add-on that reads the email you're viewing, extracts its ontological **ABox** with an LLM grounded in a corporate **TBox** (a subset of the [gist](https://www.semanticarts.com/gist/) upper ontology), and turns the actionable parts into real **Google Tasks**.

OntoMail runs the full **TBox → LLM → ABox** cycle inside Gmail: it doesn't just summarize an email, it extracts typed instances (people, organizations, commitments, dates, amounts) as JSON-LD, lets you review and edit them, and creates tasks from the commitments. Preserved ABoxes are the seed of a future enterprise knowledge graph.

## How it works

```
Gmail email ──Process──▶ Gemini (+ gist TBox) ──▶ ABox (JSON-LD)
                                                      │
                        ┌─────────────────────────────┤
                        ▼                             ▼
             Parking lot (grouped          Actionables (commitments):
             by gist type, read-only)      select · edit title/date · Create tasks
                        │                             │
                        └──────────── Preserve ───────┴──▶ Drive/OntoMail/*.md
                                                                  │
                                                          Google Tasks
```

- **Process** reads the open email and sends its text plus a gist TBox subset to Gemini, which returns the email's ABox as JSON-LD.
- **Parking lot** renders the extracted instances grouped by gist type (👤 Person, 🏢 Organization, 📌 Commitment, 📅 Date/TimeInterval, 💰 Amount/Magnitude).
- **Actionables** lists the commitments with a selection switch and editable title + due date; **Create tasks** inserts them into Google Tasks.
- **Preserve in Drive** writes a Markdown file (embedded JSON-LD + a link back to the email) into an `OntoMail` folder in your Drive.

## The gist TBox subset

OntoMail maps five entity types to canonical gist classes (namespace `https://w3id.org/semanticarts/ontology/gistCore#`):

| OntoMail type | gist class |
|---|---|
| Person | `gist:Person` |
| Organization | `gist:Organization` |
| Commitment / task | `gist:Commitment` |
| Date / deadline | `gist:TimeInterval` |
| Amount | `gist:Magnitude` |

The subset lives in [`tbox.gs`](tbox.gs) — the one place to edit the ontology as it grows toward the full corporate TBox.

## Tech

- **Google Apps Script** (V8) — the whole add-on.
- **Gmail Add-on / CardService** — the UI and Gmail integration.
- **Gemini API** via `UrlFetchApp`, with JSON structured output.
- **Google Tasks** (advanced service) and **Google Drive** (`DriveApp`).

## Setup

1. Install [clasp](https://github.com/google/clasp) and log in: `clasp login`.
2. Create the Apps Script project (writes the `scriptId` into `.clasp.json`):
   ```
   clasp create-script --type standalone --title OntoMail
   ```
   > Note: `clasp create-script` overwrites `appsscript.json` with a bare default. Restore this repo's manifest afterward (`git checkout -- appsscript.json`) before pushing.
3. Push the code:
   ```
   clasp push --force
   ```
4. In the Apps Script editor (`clasp open-script`), open **Project Settings → Script Properties** and add:
   - `GEMINI_API_KEY` — your [Google AI Studio](https://aistudio.google.com/) API key.
   - `GEMINI_MODEL` — e.g. `models/gemini-2.0-flash` (with or without the `models/` prefix).
5. **Deploy → Test deployments → Install**, then open Gmail.

## Try it

1. Open an email that contains a commitment (e.g. "I'll send you the report on Friday").
2. Open OntoMail → **Procesar correo**.
3. Review the extracted instances; in **Compromisos**, edit a title or due date and press **Crear tareas**.
4. Check Google Tasks — the task appears with your edits.
5. Press **Preservar en Drive** and find the Markdown file in your Drive's `OntoMail` folder.

## OAuth scopes

OntoMail requests Gmail add-on + current-message read, Google Tasks, Drive, and external requests (for the Gemini call). The broad `auth/drive` scope is required by `DriveApp.createFile`; `drive.file` is not sufficient for creating standalone files.

## Status

Proof of concept. Single email at a time; Tasks only (Calendar and other actions are future work); the preserved Drive files are the seed of a persistent enterprise ontology, not the graph itself.

## Credits

OntoMail uses the [**gist**](https://www.semanticarts.com/gist/) upper ontology by [Semantic Arts](https://www.semanticarts.com/), distributed under the Creative Commons Attribution 4.0 International license.

---

Built at [**HakaLab**](https://hakalab.com) — _Continuous value delivery._
