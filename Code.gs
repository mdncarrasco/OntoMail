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
  var email = readCurrentEmail(e);
  var abox = extractAbox(email);
  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation().pushCard(buildResultsCard(abox))
    )
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
  return {
    subject: message.getSubject(),
    sender: message.getFrom(),
    body: message.getPlainBody()
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
  var created = [];

  for (var i = 0; i < count; i++) {
    if (!isSelected(inputs, 'select_' + i)) { continue; }

    var title = firstInput(inputs, 'title_' + i) || ('Compromiso ' + (i + 1));
    var task = { title: title };

    var dueMs = firstDateMs(inputs, 'due_' + i);
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
 * Action: preserve the ABox to Drive. Wired in slice 5.
 * @param {Object} e
 * @returns {ActionResponse}
 */
function onPreserve(e) {
  return notify('La opción de preservar en Drive se habilita en el siguiente paso.');
}

/**
 * Whether a switch field is selected. CardService only includes a switch in the
 * form inputs when it is on, so presence implies selected.
 * @param {Object} inputs - e.formInputs
 * @param {string} field
 * @returns {boolean}
 */
function isSelected(inputs, field) {
  return !!(inputs[field] && inputs[field].stringInputs &&
            inputs[field].stringInputs.value &&
            inputs[field].stringInputs.value.length > 0);
}

/**
 * Reads the first string value of a text input field, or '' if absent.
 * @param {Object} inputs
 * @param {string} field
 * @returns {string}
 */
function firstInput(inputs, field) {
  if (inputs[field] && inputs[field].stringInputs &&
      inputs[field].stringInputs.value &&
      inputs[field].stringInputs.value.length > 0) {
    return inputs[field].stringInputs.value[0];
  }
  return '';
}

/**
 * Reads a DatePicker field's ms-since-epoch value, or null if not set.
 * @param {Object} inputs
 * @param {string} field
 * @returns {number|null}
 */
function firstDateMs(inputs, field) {
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
