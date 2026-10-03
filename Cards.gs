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
 * @param {Object} emailRef - { subject, sender, permalink } for preserve.
 * @returns {Card}
 */
function buildResultsCard(abox, emailRef) {
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

  // Parking lot: every type EXCEPT commitments (those go to the actionables section).
  for (var k = 0; k < TYPE_ORDER.length; k++) {
    var type = TYPE_ORDER[k];
    if (type === 'gist:Commitment') { continue; }
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

  // Actionables: one editable, selectable entry per commitment.
  var commitments = byType['gist:Commitment'] || [];
  if (commitments.length > 0) {
    card.addSection(buildActionablesSection(commitments));
    card.addSection(buildActionButtonsSection(abox, emailRef));
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

/**
 * Builds the actionables section: each commitment gets a selection switch, an
 * editable title, and an editable due date. Field names are indexed so
 * onCreateTasks can read them back from the form.
 * @param {Object[]} commitments - gist:Commitment instances.
 * @returns {CardSection}
 */
function buildActionablesSection(commitments) {
  var section = CardService.newCardSection().setHeader('📌 Compromisos (crear tareas)');

  for (var i = 0; i < commitments.length; i++) {
    var c = commitments[i];
    var title = c.name || 'Compromiso ' + (i + 1);

    // Selection switch (checked by default) that carries this row's index.
    var selectSwitch = CardService.newDecoratedText()
      .setText(title)
      .setWrapText(true)
      .setSwitchControl(
        CardService.newSwitch()
          .setFieldName('select_' + i)
          .setValue('on')
          .setSelected(true)
      );
    section.addWidget(selectSwitch);

    // Editable title.
    section.addWidget(
      CardService.newTextInput()
        .setFieldName('title_' + i)
        .setTitle('Título de la tarea')
        .setValue(title)
    );

    // Editable due date. Prefill from the commitment's dueDate if present.
    var datePicker = CardService.newDatePicker()
      .setFieldName('due_' + i)
      .setTitle('Fecha límite (opcional)');
    var ms = parseDueDateMs(c.dueDate);
    if (ms !== null) {
      datePicker.setValueInMsSinceEpoch(ms);
    }
    section.addWidget(datePicker);
  }

  return section;
}

/**
 * Builds the action buttons: Create tasks (carries the ABox + count) and
 * Preserve in Drive (wired in slice 5).
 * @param {Object} abox
 * @param {Object} emailRef - { subject, sender, permalink } for preserve.
 * @returns {CardSection}
 */
function buildActionButtonsSection(abox, emailRef) {
  var commitmentCount = ((abox['@graph'] || []).filter(function(x) {
    return x['@type'] === 'gist:Commitment';
  })).length;

  var createAction = CardService.newAction()
    .setFunctionName('onCreateTasks')
    .setParameters({ count: String(commitmentCount) });

  var createButton = CardService.newTextButton()
    .setText('Crear tareas')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(createAction);

  var preserveButton = CardService.newTextButton()
    .setText('Preservar en Drive')
    .setOnClickAction(preserveAction(abox, emailRef));

  return CardService.newCardSection().addWidget(
    CardService.newButtonSet()
      .addButton(createButton)
      .addButton(preserveButton)
  );
}

/**
 * Parses an ISO yyyy-mm-dd due date into ms since epoch (UTC midnight), or null.
 * ponytail: naive parse — assumes the model emits yyyy-mm-dd per the prompt
 * contract; a malformed date just yields no prefill rather than throwing.
 * @param {string} iso
 * @returns {number|null}
 */
function parseDueDateMs(iso) {
  if (!iso || typeof iso !== 'string') { return null; }
  var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) { return null; }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Builds the no-actionables card: the extracted knowledge (parking lot) plus a
 * clear message that there's nothing to turn into a task. Reuses the same
 * grouped-by-type rendering; since there are no commitments, buildResultsCard
 * already omits the actionables section — we just prepend the message.
 * @param {Object} abox
 * @param {Object} emailRef - { subject, sender, permalink } for preserve.
 * @returns {Card}
 */
function buildNoActionablesCard(abox, emailRef) {
  var header = CardService.newCardHeader()
    .setTitle('Conocimiento extraído')
    .setSubtitle('Sin compromisos accionables');

  var graph = (abox && abox['@graph']) ? abox['@graph'] : [];
  var byType = {};
  for (var i = 0; i < graph.length; i++) {
    var inst = graph[i];
    var t = inst['@type'];
    if (!byType[t]) { byType[t] = []; }
    byType[t].push(inst);
  }

  var card = CardService.newCardBuilder().setHeader(header);

  card.addSection(
    CardService.newCardSection().addWidget(
      CardService.newTextParagraph().setText('Nada que accionar aquí: no se detectaron compromisos en este correo.')
    )
  );

  for (var k = 0; k < TYPE_ORDER.length; k++) {
    var type = TYPE_ORDER[k];
    if (type === 'gist:Commitment') { continue; }
    var items = byType[type];
    if (!items || items.length === 0) { continue; }

    var accent = TYPE_ACCENTS[type];
    var section = CardService.newCardSection().setHeader(accent.emoji + ' ' + accent.label);
    for (var j = 0; j < items.length; j++) {
      var name = items[j].name || items[j]['@id'] || '(sin nombre)';
      section.addWidget(CardService.newDecoratedText().setText(name).setWrapText(true));
    }
    card.addSection(section);
  }

  // Preserve is available even with no actionables — the ABox is still worth keeping.
  if (graph.length > 0) {
    card.addSection(buildPreserveOnlySection(abox, emailRef));
  }

  return card.build();
}

/**
 * A section with just the Preserve in Drive button, for the no-actionables card.
 * @param {Object} abox
 * @param {Object} emailRef
 * @returns {CardSection}
 */
function buildPreserveOnlySection(abox, emailRef) {
  var preserveButton = CardService.newTextButton()
    .setText('Preservar en Drive')
    .setOnClickAction(preserveAction(abox, emailRef));
  return CardService.newCardSection().addWidget(
    CardService.newButtonSet().addButton(preserveButton)
  );
}

/**
 * Builds the Preserve action carrying the ABox + email reference as parameters.
 * ponytail: the ABox rides in action parameters (string-capped by CardService).
 * For a single-email PoC the ABox is a handful of instances and fits; a very
 * large ABox would need a stored handle (CacheService/Properties) instead.
 * @param {Object} abox
 * @param {Object} emailRef
 * @returns {Action}
 */
function preserveAction(abox, emailRef) {
  return CardService.newAction()
    .setFunctionName('onPreserve')
    .setParameters({
      abox: JSON.stringify(abox),
      emailRef: JSON.stringify(emailRef || {})
    });
}

/**
 * Builds the error card: a clear message and a Reintentar button that re-runs
 * processing. Nothing is created or saved on this path.
 * @param {string} message
 * @returns {Card}
 */
function buildErrorCard(message) {
  var header = CardService.newCardHeader().setTitle('No se pudo procesar');

  var retryButton = CardService.newTextButton()
    .setText('Reintentar')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName('onProcess'));

  var section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph().setText(
        'Ocurrió un error al procesar el correo. No se creó ni guardó nada.'
      )
    )
    .addWidget(
      CardService.newDecoratedText().setText(message || 'Error desconocido.').setWrapText(true)
    )
    .addWidget(CardService.newButtonSet().addButton(retryButton));

  return CardService.newCardBuilder().setHeader(header).addSection(section).build();
}

/**
 * Builds the confirmation card shown after tasks are created.
 * @param {string[]} createdTitles
 * @returns {Card}
 */
function buildConfirmationCard(createdTitles) {
  var header = CardService.newCardHeader().setTitle('Tareas creadas');
  var section = CardService.newCardSection();

  if (createdTitles.length === 0) {
    section.addWidget(
      CardService.newTextParagraph().setText('No seleccionaste ningún compromiso, no se creó ninguna tarea.')
    );
  } else {
    section.addWidget(
      CardService.newTextParagraph().setText('Se crearon ' + createdTitles.length + ' tarea(s) en Google Tasks:')
    );
    for (var i = 0; i < createdTitles.length; i++) {
      section.addWidget(
        CardService.newDecoratedText().setText('✓ ' + createdTitles[i]).setWrapText(true)
      );
    }
  }

  return CardService.newCardBuilder().setHeader(header).addSection(section).build();
}
