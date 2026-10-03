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
 * Small helper: show a transient notification without changing the card.
 * @param {string} text
 * @returns {ActionResponse}
 */
function notify(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}
