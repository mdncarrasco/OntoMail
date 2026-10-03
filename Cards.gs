/**
 * Cards.gs - CardService UI builders for OntoMail.
 */

/**
 * Builds the home card: title, a short explanation, and the Process button.
 * @returns {Card}
 */
function buildHomeCardUi() {
  var header = CardService.newCardHeader()
    .setTitle('OntoMail')
    .setSubtitle('Del correo al conocimiento');

  var explanation = CardService.newTextParagraph()
    .setText(
      'Procesa el correo que estás viendo: OntoMail extrae su <b>ABox</b> ' +
      '(personas, organizaciones, compromisos, fechas y montos) usando una ' +
      'ontología <b>gist</b>, y te deja crear tareas en Google Tasks a partir ' +
      'de los compromisos detectados.'
    );

  var processButton = CardService.newTextButton()
    .setText('Procesar correo')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName('onProcess'));

  var section = CardService.newCardSection()
    .addWidget(explanation)
    .addWidget(
      CardService.newButtonSet().addButton(processButton)
    );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(section)
    .build();
}
