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
 * Action: process the currently open email.
 * Wired in slice 2 (Gemini extraction). Placeholder for now.
 * @param {Object} e - The add-on action event object.
 * @returns {ActionResponse}
 */
function onProcess(e) {
  return notify('El procesamiento se habilita en el siguiente paso.');
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
