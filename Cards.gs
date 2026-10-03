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

/**
 * Per-gist-type visual accents for the parking lot. Emoji + a human label.
 */
var TYPE_ACCENTS = {
  'gist:Person':       { emoji: '👤', label: 'Personas' },
  'gist:Organization': { emoji: '🏢', label: 'Organizaciones' },
  'gist:Commitment':   { emoji: '📌', label: 'Compromisos' },
  'gist:TimeInterval': { emoji: '📅', label: 'Fechas' },
  'gist:Magnitude':    { emoji: '💰', label: 'Montos' }
};

var TYPE_ORDER = ['gist:Person', 'gist:Organization', 'gist:Commitment', 'gist:TimeInterval', 'gist:Magnitude'];

/**
 * Builds the results card: the extracted ABox as a parking lot, with instances
 * grouped by gist type, each row carrying its type accent.
 * @param {Object} abox - JSON-LD with a @graph array of typed instances.
 * @returns {Card}
 */
function buildResultsCard(abox) {
  var header = CardService.newCardHeader()
    .setTitle('Conocimiento extraído')
    .setSubtitle('ABox del correo');

  var graph = (abox && abox['@graph']) ? abox['@graph'] : [];

  // Group instances by gist type.
  var byType = {};
  for (var i = 0; i < graph.length; i++) {
    var inst = graph[i];
    var t = inst['@type'];
    if (!byType[t]) { byType[t] = []; }
    byType[t].push(inst);
  }

  var card = CardService.newCardBuilder().setHeader(header);

  for (var k = 0; k < TYPE_ORDER.length; k++) {
    var type = TYPE_ORDER[k];
    var items = byType[type];
    if (!items || items.length === 0) { continue; }

    var accent = TYPE_ACCENTS[type];
    var section = CardService.newCardSection().setHeader(accent.emoji + ' ' + accent.label);
    for (var j = 0; j < items.length; j++) {
      var name = items[j].name || items[j]['@id'] || '(sin nombre)';
      var row = CardService.newDecoratedText()
        .setText(name)
        .setWrapText(true);
      section.addWidget(row);
    }
    card.addSection(section);
  }

  if (graph.length === 0) {
    card.addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText('No se extrajo ninguna instancia del correo.')
      )
    );
  }

  return card.build();
}
