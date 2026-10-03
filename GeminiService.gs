/**
 * GeminiService.gs - Calls Gemini to extract the email's ABox as JSON-LD.
 *
 * Reuses the proven OntoDistiller pattern: UrlFetchApp against the Gemini
 * generateContent endpoint, API key + model id read from Script Properties
 * (GEMINI_API_KEY, GEMINI_MODEL), structured output via responseMimeType +
 * responseSchema. Kept minimal on purpose: one direct call, no cache layer.
 */

/**
 * Extracts the ABox of an email as a JSON-LD object.
 * @param {{subject: string, sender: string, body: string}} email
 * @returns {Object} Parsed JSON-LD: { "@context": {...}, "@graph": [...] }
 * @throws {Error} On missing config, HTTP failure, or unparseable response.
 */
function extractAbox(email) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY');
  var model = props.getProperty('GEMINI_MODEL');

  if (!apiKey) {
    throw new Error('Falta GEMINI_API_KEY en las propiedades del script.');
  }
  if (!model || model.trim() === '') {
    throw new Error('Falta GEMINI_MODEL en las propiedades del script.');
  }
  model = model.trim();

  var url = 'https://generativelanguage.googleapis.com/v1beta/' +
    model + ':generateContent?key=' + encodeURIComponent(apiKey);

  var prompt = buildExtractionPrompt(email);

  var requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: buildAboxResponseSchema()
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code !== 200) {
    throw new Error('Gemini respondió HTTP ' + code + ': ' + text);
  }

  var body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    throw new Error('Respuesta de Gemini no es JSON: ' + text);
  }

  if (!body.candidates || !body.candidates[0] ||
      !body.candidates[0].content || !body.candidates[0].content.parts ||
      !body.candidates[0].content.parts[0]) {
    throw new Error('Estructura de respuesta de Gemini inesperada.');
  }

  var aboxText = body.candidates[0].content.parts[0].text;
  var abox;
  try {
    abox = JSON.parse(aboxText);
  } catch (e2) {
    throw new Error('El ABox devuelto no es JSON-LD válido: ' + aboxText);
  }

  if (!abox['@graph'] || !Array.isArray(abox['@graph'])) {
    throw new Error('El ABox no contiene un @graph válido.');
  }

  return abox;
}

/**
 * Builds the full extraction prompt: role, TBox subset, the email, and the
 * JSON-LD output contract.
 * @param {{subject: string, sender: string, body: string}} email
 * @returns {string}
 */
function buildExtractionPrompt(email) {
  var parts = [];
  parts.push('Eres un experto en ingeniería ontológica. Extrae el ABox del siguiente ' +
    'correo electrónico: identifica instancias de las clases gist indicadas y devuélvelas ' +
    'como JSON-LD. No inventes información que no esté en el correo.');
  parts.push('');
  parts.push(buildTboxPromptBlock());
  parts.push('');
  parts.push('=== CORREO ===');
  parts.push('Asunto: ' + (email.subject || ''));
  parts.push('Remitente: ' + (email.sender || ''));
  parts.push('Cuerpo:');
  parts.push(email.body || '');
  parts.push('');
  parts.push('=== INSTRUCCIONES DE SALIDA ===');
  parts.push('Devuelve un objeto JSON-LD con:');
  parts.push('- "@context": { "gist": "' + GIST_NAMESPACE + '" }');
  parts.push('- "@graph": un arreglo de instancias. Cada instancia tiene:');
  parts.push('  - "@id": un identificador local único (ej. "_:p1").');
  parts.push('  - "@type": una de las clases gist listadas arriba.');
  parts.push('  - "name": una etiqueta legible en español.');
  parts.push('  - "dueDate" (solo para gist:Commitment, opcional): fecha límite en formato yyyy-mm-dd si el correo la menciona.');
  parts.push('Si no hay instancias de un tipo, simplemente no las incluyas.');
  return parts.join('\n');
}
