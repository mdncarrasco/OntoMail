/**
 * Code.gs - Entry triggers and action handlers for the OntoMail Gmail Add-on.
 *
 * OntoMail reads the email you're viewing, extracts its ABox (people,
 * organizations, commitments, dates, amounts) with Gemini against a gist TBox,
 * and lets you turn actionables into Google Tasks.
 */

/**
 * Homepage trigger: shown when the add-on opens without a specific message.
 * @returns {Card} The home card.
 */
function buildHomeCard() {
  return buildHomeCardUi();
}

/**
 * Contextual trigger: shown when an email is open. Same home card for now;
 * the Process button acts on whatever message is open at press time.
 * @param {Object} e - The add-on event object.
 * @returns {Card} The home card.
 */
function buildContextualCard(e) {
  return buildHomeCardUi();
}

/**
 * Action: process the currently open email. Reads the message, extracts its
 * ABox with Gemini, and shows the results card (parking lot of instances).
 * @param {Object} e - The add-on action event object.
 * @returns {ActionResponse}
 */
function onProcess(e) {
  var abox;
  var email;
  try {
    email = readCurrentEmail(e);
    abox = extractAbox(email);
  } catch (err) {
    // Gemini failure or unparseable response: show a clear error + retry.
    // Nothing is created or saved on this path.
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().pushCard(buildErrorCard(err.message || String(err)))
      )
      .build();
  }

  var emailRef = {
    subject: email.subject,
    sender: email.sender,
    permalink: email.permalink
  };

  var hasCommitments = (abox['@graph'] || []).some(function(x) {
    return x['@type'] === 'gist:Commitment';
  });

  var card = hasCommitments
    ? buildResultsCard(abox, emailRef)
    : buildNoActionablesCard(abox, emailRef);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Reads the currently open Gmail message into a plain object.
 * @param {Object} e - The add-on event object (carries the message token).
 * @returns {{subject: string, sender: string, body: string}}
 */
function readCurrentEmail(e) {
  var accessToken = e.gmail.accessToken;
  var messageId = e.gmail.messageId;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var message = GmailApp.getMessageById(messageId);
  var thread = message.getThread();
  return {
    subject: message.getSubject(),
    sender: message.getFrom(),
    body: message.getPlainBody(),
    permalink: thread ? thread.getPermalink() : ''
  };
}

/**
 * Action: create Google Tasks from the selected, edited commitments.
 * Reads the per-row form inputs (select_i, title_i, due_i) and inserts one
 * task per selected row into the user's default task list.
 * @param {Object} e - The add-on action event object.
 * @returns {ActionResponse}
 */
function onCreateTasks(e) {
  var count = Number(e.parameters.count || '0');
  var inputs = e.formInputs || {};
  var simple = e.formInput || {};
  var created = [];

  for (var i = 0; i < count; i++) {
    if (!isSelected(simple, inputs, 'select_' + i)) { continue; }

    var title = readText(simple, inputs, 'title_' + i) || ('Compromiso ' + (i + 1));
    var task = { title: title };

    var dueMs = readDateMs(simple, inputs, 'due_' + i);
    if (dueMs !== null) {
      // Tasks API expects an RFC 3339 timestamp; the date part is what matters.
      task.due = new Date(dueMs).toISOString();
    }

    Tasks.Tasks.insert(task, '@default');
    created.push(title);
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(buildConfirmationCard(created)))
    .setNotification(
      CardService.newNotification().setText('Se crearon ' + created.length + ' tarea(s).')
    )
    .build();
}

/**
 * Action: preserve the ABox to Drive as a Markdown file (embedded JSON-LD +
 * a reference back to the source email). Independent of task creation.
 * @param {Object} e
 * @returns {ActionResponse}
 */
function onPreserve(e) {
  var abox = JSON.parse(e.parameters.abox || '{}');
  var emailRef = JSON.parse(e.parameters.emailRef || '{}');

  var markdown = buildAboxMarkdown(abox, emailRef);
  var baseName = (emailRef.subject || 'correo').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
  var fileName = 'OntoMail - ' + baseName + '.md';

  var file = DriveApp.createFile(fileName, markdown, 'text/markdown');

  return notify('Guardado en Drive: ' + file.getName());
}

/**
 * Builds the Markdown document that preserves an ABox: a human header, the
 * source-email reference, and the ABox as a fenced JSON-LD block. This is the
 * seed of the future enterprise knowledge graph.
 * @param {Object} abox
 * @param {{subject: string, sender: string, permalink: string}} emailRef
 * @returns {string}
 */
function buildAboxMarkdown(abox, emailRef) {
  var lines = [];
  lines.push('# OntoMail — ABox preservado');
  lines.push('');
  lines.push('## Correo de origen');
  lines.push('- **Asunto:** ' + (emailRef.subject || '(sin asunto)'));
  lines.push('- **Remitente:** ' + (emailRef.sender || '(desconocido)'));
  if (emailRef.permalink) {
    lines.push('- **Enlace:** ' + emailRef.permalink);
  }
  lines.push('- **Preservado:** ' + new Date().toISOString());
  lines.push('');
  lines.push('## ABox (JSON-LD)');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(abox, null, 2));
  lines.push('```');
  return lines.join('\n');
}

/**
 * Whether a switch field is selected. An unselected switch is absent from the
 * form inputs; a selected one carries its value. Reads the flat `e.formInput`
 * map first (the simple, documented shape) and falls back to the structured
 * `e.formInputs` map.
 * @param {Object} simple - e.formInput (flat fieldName -> value)
 * @param {Object} inputs - e.formInputs (structured)
 * @param {string} field
 * @returns {boolean}
 */
function isSelected(simple, inputs, field) {
  if (Object.prototype.hasOwnProperty.call(simple, field)) {
    return !!simple[field];
  }
  return !!(inputs[field] && inputs[field].stringInputs &&
            inputs[field].stringInputs.value &&
            inputs[field].stringInputs.value.length > 0);
}

/**
 * Reads a text input value, '' if absent. Flat map first, structured fallback.
 * @param {Object} simple - e.formInput
 * @param {Object} inputs - e.formInputs
 * @param {string} field
 * @returns {string}
 */
function readText(simple, inputs, field) {
  if (typeof simple[field] === 'string') {
    return simple[field];
  }
  if (inputs[field] && inputs[field].stringInputs &&
      inputs[field].stringInputs.value &&
      inputs[field].stringInputs.value.length > 0) {
    return inputs[field].stringInputs.value[0];
  }
  return '';
}

/**
 * Reads a DatePicker ms-since-epoch value, null if not set. In the flat
 * `e.formInput` map a date arrives as { msSinceEpoch } or a number; the
 * structured map uses dateInput.msSinceEpoch.
 * @param {Object} simple - e.formInput
 * @param {Object} inputs - e.formInputs
 * @param {string} field
 * @returns {number|null}
 */
function readDateMs(simple, inputs, field) {
  var v = simple[field];
  if (v && typeof v === 'object' && typeof v.msSinceEpoch !== 'undefined') {
    return Number(v.msSinceEpoch);
  }
  if (typeof v === 'number') { return v; }
  if (inputs[field] && inputs[field].dateInput &&
      typeof inputs[field].dateInput.msSinceEpoch !== 'undefined') {
    return Number(inputs[field].dateInput.msSinceEpoch);
  }
  return null;
}

/**
 * Small helper: show a transient notification without changing the card.
 * @param {string} text
 * @returns {ActionResponse}
 */
function notify(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}
