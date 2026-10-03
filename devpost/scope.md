---
doc: scope
status: approved
---

# OntoMail

One line: a Gmail Add-on that reads the email you're looking at, extracts its ontological ABox with an LLM grounded in a corporate TBox (gist), and turns what matters into real Google Tasks.

## The Unique Kernel
It doesn't just "summarize an email" — it extracts a typed **ABox** (instances of people, organizations, commitments, dates, amounts) against a **gist-based TBox**, right inside Gmail. The semantic extraction is the soul: the email becomes structured, ontology-typed knowledge, and from that knowledge the user creates real actions. Delete the ontology and it's just another email-to-task gadget; the gist typing is what makes it OntoMail.

## Who It's For
Someone at a company (starting with the learner at HakaLab) who lives in Gmail and keeps turning emails into follow-ups by hand — reading a message, mentally pulling out "who, what commitment, by when, how much," and copying that into Tasks. They want the extraction done for them, typed consistently, and the resulting knowledge preserved so it can one day feed a company-wide ontology.

## The Core Loop
Open an email in Gmail → open the OntoMail add-on panel → press "Process" → the add-on sends the email body + a gist TBox subset to an LLM → the LLM returns the email's ABox as JSON-LD → the add-on shows the extracted instances → the user reviews, edits, and marks which commitments/tasks to create → OntoMail creates those as Google Tasks, and optionally preserves the ABox. They come back every time an actionable email lands.

## Inspiration & Identity
Semantic / ontology-driven tooling applied to a mundane, high-friction daily workflow. Should feel like a quiet, trustworthy assistant inside Gmail: clean, fast, no clutter — the extracted knowledge is legible, and the user stays in control of what becomes a task. gist as the corporate "medular" (core) TBox.

## Why This Matters to the Learner
"La idea es que el sistema evolucione a una ontología empresarial." OntoMail is the first concrete, usable brick of a larger corporate-ontology vision — a way to grow a company knowledge graph one processed email at a time, while already being useful today. The learner also wants the full TBox → LLM → ABox cycle working with excellent Gmail usability.

## What "Working" Looks Like
In the demo: open a real email with a commitment in it, hit Process, watch typed instances appear (a gist:Person, a gist:Commitment with a due date), tweak a task title, press create — and the task shows up in Google Tasks. **The "oh, that's cool" beat: from the ABox, a real task is born in Google Tasks.**

## The POC Boundary
In:
- Gmail Add-on (Apps Script, CardService) that acts on the currently open email.
- "Process" sends email body + a **gist TBox subset** (Person, Organization, Commitment/Task, Date, Amount) to an LLM.
- LLM returns the ABox as **JSON-LD** (`@context` for the gist subset, instances with gist `@type`).
- Add-on renders the extracted instances; user can **select and edit** candidate tasks (at least title + due date) before creating.
- Creating selected items as **Google Tasks**.
- "Preserve" = save a **Markdown file in Google Drive** containing the ABox (embedded JSON-LD) + a reference back to the source email.

## Later
- Calendar events and other action types beyond Tasks.
- A real persistent knowledge graph / enterprise ontology store (the Drive Markdown file is the seed).
- Full gist TBox instead of a hand-picked subset.
- Deduplication / linking of instances across emails.

## Explicitly Cut
- **Auto-creating tasks without review** — the user must stay in control; selection + edit is part of the kernel's value.
- **Deployment / marketplace publishing** — optional for the hackathon; a working add-on in the learner's own Gmail is enough to demo.
- **Multi-email / inbox-wide batch processing** — the loop is one email at a time; batching is scope creep for a PoC.
